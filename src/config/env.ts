import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  HOST: string;
  JWT_SECRET: string;
  JWT_EXPIRY: string;
  JWT_REFRESH_EXPIRY: string;
  BCRYPT_ROUNDS: number;
  ENCRYPTION_KEY: string;
  HMAC_SECRET: string;
  MODERATOR_PIN_LENGTH: number;
  ESCROW_TIMEOUT_MINUTES: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
}

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'HMAC_SECRET',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const config: EnvConfig = {
  DATABASE_URL: process.env.DATABASE_URL!,
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'production',
  PORT: parseInt(process.env.PORT || '3000'),
  HOST: process.env.HOST || '0.0.0.0',
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '30d',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
  HMAC_SECRET: process.env.HMAC_SECRET!,
  MODERATOR_PIN_LENGTH: parseInt(process.env.MODERATOR_PIN_LENGTH || '6'),
  ESCROW_TIMEOUT_MINUTES: parseInt(process.env.ESCROW_TIMEOUT_MINUTES || '20'),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
};

export default config;
