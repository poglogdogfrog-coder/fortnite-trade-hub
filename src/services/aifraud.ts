import { query } from '@/config/database';
import { ANTI_SHARK_VALUE_THRESHOLD, SCAM_REPORT_THRESHOLD, SCAM_REPORT_WINDOW_HOURS } from '@/config/constants';

interface TextAnalysisFlags {
  allCaps: boolean;
  frequentExclamation: boolean;
  suspiciousKeywords: string[];
  linkCount: number;
  urgencyLanguage: boolean;
}

interface TradingPatternFlags {
  highVolumeInShortTime: boolean;
  valueSkew: boolean;
  multipleDeclines: boolean;
  rapidCancellations: boolean;
}

export const AIFraudService = {
  async analyzeTextContent(text: string): Promise<TextAnalysisFlags> {
    const suspiciousKeywords = ['free', 'guaranteed', 'click here', 'limited time', 'act now', 'urgent'];
    const flags: TextAnalysisFlags = {
      allCaps: (text.match(/[A-Z]/g) || []).length > text.length * 0.5,
      frequentExclamation: (text.match(/!/g) || []).length > 3,
      suspiciousKeywords: suspiciousKeywords.filter(kw => text.toLowerCase().includes(kw)),
      linkCount: (text.match(/(https?:\/\/|www\.)/g) || []).length,
      urgencyLanguage: /urgent|asap|hurry|quick|immediately/i.test(text),
    };
    return flags;
  },

  async analyzeTradingPatterns(userId: string): Promise<TradingPatternFlags> {
    // Get last 30 days of trades
    const trades = await query(
      `SELECT t.*, COUNT(*) as trade_count
       FROM trades t
       WHERE t.initiator_id = $1 OR t.responder_id = $1
       AND t.created_at > NOW() - INTERVAL '30 days'
       GROUP BY t.id`,
      [userId]
    );

    const recentTrades = trades.rows.slice(-10);
    const cancelledRecently = recentTrades.filter(t => t.status === 'rejected' || t.status === 'expired');

    // Analyze value skew (anti-shark detection)
    let valueSkew = false;
    for (const trade of recentTrades) {
      const haveValue = await this.calculateTradeValue(trade.id, 'have');
      const wantValue = await this.calculateTradeValue(trade.id, 'want');
      const variance = Math.abs(haveValue - wantValue) / Math.max(haveValue, wantValue);
      if (variance > ANTI_SHARK_VALUE_THRESHOLD) {
        valueSkew = true;
        break;
      }
    }

    return {
      highVolumeInShortTime: recentTrades.length > 20,
      valueSkew,
      multipleDeclines: cancelledRecently.length > 5,
      rapidCancellations: cancelledRecently.length > 3,
    };
  },

  async calculateFraudScore(userId: string): Promise<number> {
    // Get user's report history
    const reports = await query(
      `SELECT COUNT(*) as count FROM user_reports
       WHERE reported_user_id = $1
       AND created_at > NOW() - INTERVAL '${SCAM_REPORT_WINDOW_HOURS} hours'`,
      [userId]
    );

    const reportCount = parseInt(reports.rows[0].count) || 0;
    const reportWeight = Math.min(reportCount / SCAM_REPORT_THRESHOLD, 1) * 0.4;

    // Account age score (new accounts = higher risk)
    const userInfo = await query(
      `SELECT EXTRACT(DAY FROM (NOW() - created_at)) as account_age_days
       FROM users WHERE id = $1`,
      [userId]
    );
    const accountAgeDays = parseInt(userInfo.rows[0]?.account_age_days) || 0;
    const ageScore = Math.max(0, 1 - accountAgeDays / 365) * 0.3;

    // Text analysis
    const recentMessages = await query(
      `SELECT message_content FROM chat_messages
       WHERE sender_id = $1 AND created_at > NOW() - INTERVAL '7 days'
       LIMIT 10`,
      [userId]
    );

    let textScore = 0;
    for (const msg of recentMessages.rows) {
      const flags = await this.analyzeTextContent(msg.message_content);
      const flagCount = Object.values(flags).filter(v => 
        (typeof v === 'boolean' && v) || (typeof v === 'number' && v > 0) || (Array.isArray(v) && v.length > 0)
      ).length;
      textScore += flagCount / 5;
    }
    textScore = Math.min(textScore / recentMessages.rows.length, 1) * 0.2;

    // Trading patterns
    const patterns = await this.analyzeTradingPatterns(userId);
    const patternScore = (Object.values(patterns).filter(v => v).length / 4) * 0.1;

    const totalScore = reportWeight + ageScore + textScore + patternScore;
    return Math.min(totalScore, 1);
  },

  async checkAntiShark(initiatorId: string, responderId: string, tradeId: string): Promise<{ isShark: boolean; sharkType?: string }> {
    const haveValue = await this.calculateTradeValue(tradeId, 'have');
    const wantValue = await this.calculateTradeValue(tradeId, 'want');
    
    const variance = Math.abs(haveValue - wantValue) / Math.max(haveValue, wantValue);
    if (variance > ANTI_SHARK_VALUE_THRESHOLD) {
      return { isShark: true, sharkType: variance > 0.5 ? 'extreme' : 'moderate' };
    }
    return { isShark: false };
  },

  async calculateTradeValue(tradeId: string, type: 'have' | 'want'): Promise<number> {
    const tableName = type === 'have' ? 'trade_items_have' : 'trade_items_want';
    const result = await query(
      `SELECT SUM(i.current_price * t.quantity) as total_value
       FROM ${tableName} t
       JOIN items i ON t.item_id = i.id
       WHERE t.trade_id = $1`,
      [tradeId]
    );
    return parseFloat(result.rows[0]?.total_value) || 0;
  },
};
