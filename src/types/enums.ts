export enum UserRole {
  USER = 'user',
  JUNIOR_MOD = 'junior_mod',
  SENIOR_ESCROW = 'senior_escrow',
  FULL_ADMIN = 'full_admin',
  SUPER_USER = 'super_user',
}

export enum TrustTier {
  NOVICE = 'novice',
  EXPERIENCED = 'experienced',
  MASTER = 'master',
  TRUSTED_LEGEND = 'trusted_legend',
}

export enum TradePhase {
  OPEN = 'open',
  LINKED = 'linked',
  MIDDLEMAN_CLAIMED = 'middleman_claimed',
  IN_CUSTODY = 'in_custody',
  DISBURSED = 'disbursed',
  FINALIZED = 'finalized',
  CANCELLED = 'cancelled',
}

export enum TradeStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

export enum ItemRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
  MYTHIC = 'mythic',
}

export enum NotificationType {
  TRADE_OFFER = 'trade_offer',
  TRADE_ACCEPTED = 'trade_accepted',
  TRADE_REJECTED = 'trade_rejected',
  ESCROW_INITIATED = 'escrow_initiated',
  MIDDLEMAN_NEEDED = 'middleman_needed',
  REVIEW_REQUEST = 'review_request',
  MESSAGE = 'message',
  SYSTEM = 'system',
}

export enum ReportType {
  SCAM = 'scam',
  OFFENSIVE_LANGUAGE = 'offensive_language',
  ITEM_FRAUD = 'item_fraud',
  ACCOUNT_COMPROMISE = 'account_compromise',
  OTHER = 'other',
}

export enum ApplicationStatus {
  RECEIVED = 'received',
  UNDER_INTERVIEW = 'under_interview',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
