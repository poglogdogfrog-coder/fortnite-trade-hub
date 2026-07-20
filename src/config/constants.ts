export const FORTNITE_RARITIES = {
  COMMON: { name: 'Common', hex: '#B0B0B0', weight: 45 },
  UNCOMMON: { name: 'Uncommon', hex: '#00FF00', weight: 30 },
  RARE: { name: 'Rare', hex: '#0070DD', weight: 15 },
  EPIC: { name: 'Epic', hex: '#A335EE', weight: 7 },
  LEGENDARY: { name: 'Legendary', hex: '#FF8000', weight: 2.5 },
  MYTHIC: { name: 'Mythic', hex: '#E6CC80', weight: 0.5 },
};

export const TRADE_PHASES = {
  OPEN: 'open',
  LINKED: 'linked',
  MIDDLEMAN_CLAIMED: 'middleman_claimed',
  IN_CUSTODY: 'in_custody',
  DISBURSED: 'disbursed',
  FINALIZED: 'finalized',
  CANCELLED: 'cancelled',
};

export const USER_ROLES = {
  USER: 'user',
  JUNIOR_MOD: 'junior_mod',
  SENIOR_ESCROW: 'senior_escrow',
  FULL_ADMIN: 'full_admin',
  SUPER_USER: 'super_user',
};

export const TRUST_TIERS = {
  NOVICE: 'novice',
  EXPERIENCED: 'experienced',
  MASTER: 'master',
  TRUSTED_LEGEND: 'trusted_legend',
};

export const SCAM_REPORT_THRESHOLD = 5;
export const SCAM_REPORT_WINDOW_HOURS = 12;
export const AUTO_BAN_THRESHOLD = 5;

export const MAGIC_LINK_EXPIRY_MINUTES = 15;
export const JWT_CLOCK_TOLERANCE = 60; // seconds

export const ESCROW_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
export const DATA_SYNC_CRON = '0 * * * *'; // Every hour at minute 0

export const MAX_BUNDLE_ITEMS = 15;
export const MAX_CHAT_MESSAGE_LENGTH = 500;
export const MAX_REPORT_ATTACHMENTS = 5;

export const ANTI_SHARK_VALUE_THRESHOLD = 0.1; // 10% of item value
