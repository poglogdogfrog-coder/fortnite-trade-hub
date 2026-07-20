export interface User {
  id: string;
  username: string;
  email?: string;
  verified_account: boolean;
  avatar_hash?: string;
  bio?: string;
  is_banned: boolean;
  created_at: Date;
}

export interface UserSession {
  id: string;
  user_id: string;
  jwt_token_hash: string;
  refresh_token_hash: string;
  ip_address?: string;
  device_fingerprint?: string;
  created_at: Date;
  expires_at: Date;
}

export interface Item {
  id: string;
  name: string;
  game_name: string;
  item_type: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  drop_chance: number;
  current_price: number;
  is_limited: boolean;
  created_at: Date;
}

export interface Trade {
  id: string;
  initiator_id: string;
  responder_id?: string;
  phase: 'open' | 'linked' | 'middleman_claimed' | 'in_custody' | 'disbursed' | 'finalized' | 'cancelled';
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'expired';
  created_at: Date;
  expires_at?: Date;
}

export interface UserReputation {
  user_id: string;
  trust_score: number;
  trust_tier: 'novice' | 'experienced' | 'master' | 'trusted_legend';
  total_completed_trades: number;
  verified_trades: number;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  trade_id: string;
  rating: number;
  comment?: string;
  created_at: Date;
}

export interface EscrowTrade {
  id: string;
  trade_id: string;
  initiator_id: string;
  responder_id: string;
  middleman_id?: string;
  phase: 'open' | 'linked' | 'middleman_claimed' | 'in_custody' | 'disbursed' | 'finalized';
  created_at: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

export interface StaffApplication {
  id: string;
  user_id: string;
  email: string;
  status: 'received' | 'under_interview' | 'approved' | 'rejected';
  created_at: Date;
}
