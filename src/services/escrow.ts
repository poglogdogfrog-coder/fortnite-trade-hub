import { query } from '@/config/database';
import { v4 as uuidv4 } from 'uuid';
import { ESCROW_TIMEOUT_MS } from '@/config/constants';

export const EscrowService = {
  async initiateEscrow(tradeId: string, initiatorId: string, responderId: string) {
    const escrowId = uuidv4();
    const escrowCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    await query(
      `INSERT INTO escrow_trades (id, trade_id, initiator_id, responder_id, escrow_code, phase, created_at)
       VALUES ($1, $2, $3, $4, $5, 'open', NOW())`,
      [escrowId, tradeId, initiatorId, responderId, escrowCode]
    );

    // Update trade phase
    await query(
      `UPDATE trades SET phase = 'linked' WHERE id = $1`,
      [tradeId]
    );

    // Log to console (stdout logging)
    console.log(`\n${'='.repeat(60)}\n🛡️ ESCROW INITIATED\nEscrow ID: ${escrowId}\nEscrow Code: ${escrowCode}\nTrade ID: ${tradeId}\n${'='.repeat(60)}\n`);

    return { escrowId, escrowCode };
  },

  async requestMiddleman(escrowId: string, requesterId: string) {
    // Find available middleman with lowest workload
    const middleman = await query(
      `SELECT sr.user_id, mw.current_load_percentage
       FROM staff_roles sr
       LEFT JOIN middleman_workload mw ON sr.user_id = mw.middleman_id
       WHERE sr.role IN ('senior_escrow', 'full_admin', 'super_user')
       AND sr.is_active = true
       ORDER BY mw.current_load_percentage ASC NULLS FIRST
       LIMIT 1`
    );

    if (middleman.rows.length === 0) {
      throw new Error('No middlemen available');
    }

    const middlemanId = middleman.rows[0].user_id;

    await query(
      `UPDATE escrow_trades
       SET middleman_id = $1, phase = 'middleman_claimed'
       WHERE id = $2`,
      [middlemanId, escrowId]
    );

    // Update workload
    await query(
      `UPDATE middleman_workload
       SET pending_cases = pending_cases + 1, current_load_percentage = (pending_cases + 1) * 5
       WHERE middleman_id = $1`,
      [middlemanId]
    );

    console.log(`\n${'='.repeat(60)}\n👤 MIDDLEMAN ASSIGNED\nMiddleman ID: ${middlemanId}\nEscrow ID: ${escrowId}\n${'='.repeat(60)}\n`);

    return { middlemanId, escrowId };
  },

  async confirmCustody(escrowId: string, middlemanId: string, pin: string) {
    const escrow = await query(
      `SELECT middleman_pin_hash FROM escrow_trades WHERE id = $1`,
      [escrowId]
    );

    if (escrow.rows.length === 0) {
      throw new Error('Escrow not found');
    }

    // In production, verify PIN hash. Here simplified for demo.
    await query(
      `UPDATE escrow_trades
       SET phase = 'in_custody', middleman_pin_verified_at = NOW(), security_hold_until = NOW() + INTERVAL '20 minutes'
       WHERE id = $1`,
      [escrowId]
    );

    return { escrowId, status: 'in_custody' };
  },

  async finalizeEscrow(escrowId: string) {
    const escrow = await query(
      `SELECT trade_id FROM escrow_trades WHERE id = $1`,
      [escrowId]
    );

    if (escrow.rows.length === 0) {
      throw new Error('Escrow not found');
    }

    const tradeId = escrow.rows[0].trade_id;

    await query(
      `UPDATE escrow_trades
       SET phase = 'finalized', finalized_at = NOW()
       WHERE id = $1`,
      [escrowId]
    );

    await query(
      `UPDATE trades
       SET phase = 'finalized', status = 'completed', completed_at = NOW()
       WHERE id = $1`,
      [tradeId]
    );

    console.log(`\n${'='.repeat(60)}\n✅ ESCROW FINALIZED\nEscrow ID: ${escrowId}\nTrade ID: ${tradeId}\n${'='.repeat(60)}\n`);

    return { escrowId, status: 'finalized' };
  },

  async checkEscrowTimeout() {
    const expiredEscrows = await query(
      `SELECT id, trade_id FROM escrow_trades
       WHERE security_hold_until < NOW() AND phase != 'finalized'`
    );

    for (const escrow of expiredEscrows.rows) {
      await query(
        `UPDATE escrow_trades SET phase = 'cancelled' WHERE id = $1`,
        [escrow.id]
      );
      await query(
        `UPDATE trades SET phase = 'cancelled', status = 'expired' WHERE id = $1`,
        [escrow.trade_id]
      );
    }

    return expiredEscrows.rows.length;
  },
};
