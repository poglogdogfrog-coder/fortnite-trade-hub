import { query } from '@/config/database';
import { generateHash, generateToken, generateMagicLinkToken } from '@/utils/crypto';
import { MAGIC_LINK_EXPIRY_MINUTES } from '@/config/constants';
import jwt from 'jsonwebtoken';
import config from '@/config/env';
import { v4 as uuidv4 } from 'uuid';

export const AuthService = {
  async requestMagicLink(email: string) {
    const token = generateMagicLinkToken();
    const tokenHash = generateHash(token);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60000);

    await query(
      `INSERT INTO magic_link_tokens (email, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [email, tokenHash, expiresAt]
    );

    // In production, send email. Here we log to console (stdout logging)
    console.log(`\n${'='.repeat(60)}\n🔗 MAGIC LINK TOKEN\nEmail: ${email}\nToken: ${token}\nExpires: ${expiresAt.toISOString()}\n${'='.repeat(60)}\n`);

    return { email, expiresAt };
  },

  async verifyMagicLink(token: string, email: string) {
    const tokenHash = generateHash(token);

    const result = await query(
      `SELECT id, used_at FROM magic_link_tokens
       WHERE token_hash = $1 AND email = $2 AND expires_at > NOW()`,
      [tokenHash, email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired magic link');
    }

    const linkToken = result.rows[0];
    if (linkToken.used_at) {
      throw new Error('Magic link already used');
    }

    // Mark as used
    let user = await query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );

    let userId = user.rows[0]?.id;
    if (!userId) {
      userId = uuidv4();
      await query(
        `INSERT INTO users (id, username, email, verified_account)
         VALUES ($1, $2, $3, true)`,
        [userId, email.split('@')[0], email]
      );
    }

    await query(
      `UPDATE magic_link_tokens SET used_at = NOW(), used_by_user_id = $1
       WHERE id = $2`,
      [userId, linkToken.id]
    );

    // Create reputation if not exists
    const repCheck = await query(
      `SELECT id FROM user_reputation WHERE user_id = $1`,
      [userId]
    );
    
    if (repCheck.rows.length === 0) {
      await query(
        `INSERT INTO user_reputation (user_id, trust_score, trust_tier)
         VALUES ($1, 0, 'novice')`,
        [userId]
      );
    }

    return { userId, email };
  },

  async createJWT(userId: string, ipAddress?: string, deviceFingerprint?: string) {
    const sessionId = uuidv4();
    const token = jwt.sign({ userId, sessionId }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRY,
    });

    const refreshToken = jwt.sign({ userId, sessionId }, config.JWT_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRY,
    });

    const tokenHash = generateHash(token);
    const refreshTokenHash = generateHash(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      `INSERT INTO user_sessions (id, user_id, jwt_token_hash, refresh_token_hash, ip_address, device_fingerprint, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sessionId, userId, tokenHash, refreshTokenHash, ipAddress, deviceFingerprint, expiresAt]
    );

    return { token, refreshToken, sessionId, expiresAt };
  },

  async verifyJWT(token: string) {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      return decoded;
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  },

  async revokeSession(sessionId: string) {
    await query(
      `UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1`,
      [sessionId]
    );
  },

  async revokeAllSessions(userId: string) {
    await query(
      `UPDATE user_sessions SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
  },
};
