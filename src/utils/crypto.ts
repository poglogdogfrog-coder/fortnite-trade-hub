import crypto from 'crypto';
import config from '@/config/env';

export const generateHash = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

export const encryptAES256 = (text: string, key: string): { encrypted: string; iv: string } => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'utf8').slice(0, 32), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { encrypted, iv: iv.toString('hex') };
};

export const decryptAES256 = (encrypted: string, key: string, iv: string): string => {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'utf8').slice(0, 32), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export const generateHMAC = (data: string, secret: string): string => {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

export const verifyHMAC = (data: string, signature: string, secret: string): boolean => {
  const computed = generateHMAC(data, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
};

export const generateMagicLinkToken = (): string => {
  return generateToken(32);
};

export const generateEscrowCode = (): string => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

export const generateModeratorPIN = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
