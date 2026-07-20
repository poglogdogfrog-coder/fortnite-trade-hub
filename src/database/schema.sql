-- SECTION 1: AUTHENTICATION & SESSIONS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  fortnite_account_name VARCHAR(255),
  epic_games_id VARCHAR(255) UNIQUE,
  verified_account BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(6),
  verification_code_expires_at TIMESTAMP,
  avatar_hash VARCHAR(255),
  bio TEXT,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  banned_at TIMESTAMP,
  vacation_mode BOOLEAN DEFAULT FALSE,
  vacation_mode_enabled_at TIMESTAMP,
  CONSTRAINT valid_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_epic_games_id ON users(epic_games_id);
CREATE INDEX idx_users_is_banned ON users(is_banned);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jwt_token_hash VARCHAR(255) UNIQUE NOT NULL,
  refresh_token_hash VARCHAR(255) UNIQUE NOT NULL,
  ip_address INET,
  user_agent VARCHAR(500),
  geolocation JSONB,
  device_fingerprint VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  CONSTRAINT valid_session CHECK (expires_at > created_at)
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  used_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_magic_link_tokens_email ON magic_link_tokens(email);
CREATE INDEX idx_magic_link_tokens_expires_at ON magic_link_tokens(expires_at);

-- SECTION 2: ITEMS & PRICING
CREATE TYPE item_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic');

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  game_name VARCHAR(100) NOT NULL,
  item_type VARCHAR(100) NOT NULL,
  rarity item_rarity NOT NULL,
  rarity_hex_color VARCHAR(7),
  drop_chance NUMERIC(12, 10) NOT NULL,
  current_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  average_price NUMERIC(15, 2),
  suggested_price NUMERIC(15, 2),
  last_24h_volume BIGINT DEFAULT 0,
  last_7d_volume BIGINT DEFAULT 0,
  global_availability_multiplier DECIMAL(10, 6) DEFAULT 1.0,
  is_limited BOOLEAN DEFAULT FALSE,
  limited_remaining_stock BIGINT,
  exists_count BIGINT DEFAULT 0,
  seed_vault_backup JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_last_verified_at TIMESTAMP,
  CONSTRAINT positive_price CHECK (current_price >= 0),
  CONSTRAINT positive_drop_chance CHECK (drop_chance >= 0 AND drop_chance <= 1),
  CONSTRAINT positive_multiplier CHECK (global_availability_multiplier > 0)
);

CREATE INDEX idx_items_game_name ON items(game_name);
CREATE INDEX idx_items_rarity ON items(rarity);
CREATE INDEX idx_items_current_price ON items(current_price);
CREATE INDEX idx_items_last_24h_volume ON items(last_24h_volume);

CREATE TABLE IF NOT EXISTS item_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  price NUMERIC(15, 2) NOT NULL,
  volume BIGINT DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT positive_price CHECK (price >= 0)
);

CREATE INDEX idx_item_price_history_item_id_recorded_at ON item_price_history(item_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS item_peer_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  upvote BOOLEAN NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_id, user_id)
);

CREATE INDEX idx_item_peer_valuations_item_id ON item_peer_valuations(item_id);

-- SECTION 3: USER INVENTORY
CREATE TABLE IF NOT EXISTS user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  nft_status VARCHAR(50) DEFAULT 'open_to_offers',
  is_public BOOLEAN DEFAULT TRUE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, item_id),
  CONSTRAINT positive_quantity CHECK (quantity > 0),
  CONSTRAINT valid_nft_status CHECK (nft_status IN ('open_to_offers', 'not_for_trade', 'nft'))
);

CREATE INDEX idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX idx_user_inventory_is_public ON user_inventory(is_public);

CREATE TABLE IF NOT EXISTS user_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  alert_sent_at TIMESTAMP,
  UNIQUE(user_id, item_id)
);

CREATE INDEX idx_user_wishlists_user_id ON user_wishlists(user_id);

-- SECTION 4: TRADING
CREATE TYPE trade_phase AS ENUM ('open', 'linked', 'middleman_claimed', 'in_custody', 'disbursed', 'finalized', 'cancelled');
CREATE TYPE trade_status AS ENUM ('pending', 'accepted', 'rejected', 'completed', 'expired');

CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  responder_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phase trade_phase DEFAULT 'open',
  status trade_status DEFAULT 'pending',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT
);

CREATE INDEX idx_trades_initiator_id ON trades(initiator_id);
CREATE INDEX idx_trades_responder_id ON trades(responder_id);
CREATE INDEX idx_trades_phase ON trades(phase);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_expires_at ON trades(expires_at);

CREATE TABLE IF NOT EXISTS trade_items_have (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT positive_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_trade_items_have_trade_id ON trade_items_have(trade_id);

CREATE TABLE IF NOT EXISTS trade_items_want (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT positive_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_trade_items_want_trade_id ON trade_items_want(trade_id);

CREATE TABLE IF NOT EXISTS trade_counter_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  counter_trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  proposer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending'
);

CREATE INDEX idx_trade_counter_offers_original_trade_id ON trade_counter_offers(original_trade_id);

-- SECTION 5: REPUTATION & TRUST
CREATE TABLE IF NOT EXISTS user_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  trust_score DECIMAL(3, 2) DEFAULT 0.0,
  trust_tier VARCHAR(50) DEFAULT 'novice',
  total_completed_trades BIGINT DEFAULT 0,
  total_volume_traded NUMERIC(15, 2) DEFAULT 0,
  verified_trades BIGINT DEFAULT 0,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_trust_score CHECK (trust_score >= 0.0 AND trust_score <= 5.0)
);

CREATE INDEX idx_user_reputation_user_id ON user_reputation(user_id);
CREATE INDEX idx_user_reputation_trust_score ON user_reputation(trust_score);

CREATE TABLE IF NOT EXISTS user_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  rating DECIMAL(3, 2) NOT NULL,
  comment TEXT,
  verified_by_middleman_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_rating CHECK (rating >= 0.0 AND rating <= 5.0),
  CONSTRAINT prevent_self_review CHECK (reviewer_id != reviewee_id)
);

CREATE INDEX idx_user_reviews_reviewee_id ON user_reviews(reviewee_id);
CREATE INDEX idx_user_reviews_reviewer_id ON user_reviews(reviewer_id);

CREATE TABLE IF NOT EXISTS scammer_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  hardware_fingerprint VARCHAR(255),
  ip_address INET,
  ban_reason TEXT NOT NULL,
  report_count BIGINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX idx_scammer_blacklist_user_id ON scammer_blacklist(user_id);
CREATE INDEX idx_scammer_blacklist_hardware_fingerprint ON scammer_blacklist(hardware_fingerprint);
CREATE INDEX idx_scammer_blacklist_ip_address ON scammer_blacklist(ip_address);

-- SECTION 6: ESCROW & MIDDLEMAN
CREATE TABLE IF NOT EXISTS escrow_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE UNIQUE,
  initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  responder_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  middleman_id UUID REFERENCES users(id) ON DELETE SET NULL,
  escrow_code VARCHAR(10) UNIQUE,
  middleman_pin_hash VARCHAR(255),
  middleman_pin_verified_at TIMESTAMP,
  phase trade_phase DEFAULT 'open',
  security_hold_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finalized_at TIMESTAMP
);

CREATE INDEX idx_escrow_trades_trade_id ON escrow_trades(trade_id);
CREATE INDEX idx_escrow_trades_middleman_id ON escrow_trades(middleman_id);
CREATE INDEX idx_escrow_trades_phase ON escrow_trades(phase);
CREATE INDEX idx_escrow_trades_security_hold_until ON escrow_trades(security_hold_until);

CREATE TABLE IF NOT EXISTS escrow_digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES escrow_trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  phase trade_phase NOT NULL,
  signature_json JSONB NOT NULL,
  ip_address INET,
  user_agent VARCHAR(500),
  signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_escrow_digital_signatures_escrow_id ON escrow_digital_signatures(escrow_id);

CREATE TABLE IF NOT EXISTS middleman_proof_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES escrow_trades(id) ON DELETE CASCADE,
  middleman_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  proof_base64 TEXT NOT NULL,
  proof_description TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_middleman_proof_uploads_escrow_id ON middleman_proof_uploads(escrow_id);

CREATE TABLE IF NOT EXISTS middleman_workload (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  middleman_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  pending_cases BIGINT DEFAULT 0,
  completed_cases BIGINT DEFAULT 0,
  average_resolution_time_minutes BIGINT DEFAULT 0,
  current_load_percentage DECIMAL(5, 2) DEFAULT 0,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SECTION 7: MODERATION & STAFF
CREATE TYPE staff_role AS ENUM ('user', 'junior_mod', 'senior_escrow', 'full_admin', 'super_user');
CREATE TYPE application_status AS ENUM ('received', 'under_interview', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS staff_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  date_of_birth DATE NOT NULL,
  background_text TEXT NOT NULL,
  timezone VARCHAR(50),
  languages VARCHAR(255),
  availability_hours JSONB,
  status application_status DEFAULT 'received',
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_applications_status ON staff_applications(status);
CREATE INDEX idx_staff_applications_user_id ON staff_applications(user_id);

CREATE TABLE IF NOT EXISTS staff_identity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES staff_applications(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  document_data_encrypted TEXT NOT NULL,
  encryption_iv VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  role staff_role DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  suspended_at TIMESTAMP,
  suspension_reason TEXT
);

CREATE INDEX idx_staff_roles_user_id ON staff_roles(user_id);
CREATE INDEX idx_staff_roles_role ON staff_roles(role);

CREATE TABLE IF NOT EXISTS staff_shift_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_out_at TIMESTAMP,
  duration_minutes BIGINT,
  cases_handled BIGINT DEFAULT 0
);

CREATE INDEX idx_staff_shift_logs_staff_id ON staff_shift_logs(staff_id);
CREATE INDEX idx_staff_shift_logs_checked_in_at ON staff_shift_logs(checked_in_at);

CREATE TABLE IF NOT EXISTS staff_nda_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  agreement_version VARCHAR(50) NOT NULL,
  accepted_at TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  target_trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  details JSONB,
  ip_address INET,
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

-- SECTION 8: MODERATION & REPORTING
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  report_type VARCHAR(100) NOT NULL,
  violation_description TEXT NOT NULL,
  proof_details JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  reviewed_by_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  action_taken TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prevent_self_report CHECK (reporter_id != reported_user_id)
);

CREATE INDEX idx_user_reports_reported_user_id ON user_reports(reported_user_id);
CREATE INDEX idx_user_reports_status ON user_reports(status);
CREATE INDEX idx_user_reports_created_at ON user_reports(created_at DESC);

CREATE TABLE IF NOT EXISTS review_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES user_reviews(id) ON DELETE CASCADE,
  disputer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dispute_reason TEXT NOT NULL,
  evidence_details JSONB,
  status VARCHAR(50) DEFAULT 'open',
  reviewed_by_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  arbitration_decision TEXT,
  decided_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_review_disputes_disputer_id ON review_disputes(disputer_id);
CREATE INDEX idx_review_disputes_status ON review_disputes(status);

-- SECTION 9: CHAT & MESSAGING
CREATE TABLE IF NOT EXISTS user_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_one_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_two_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP,
  CHECK (user_one_id != user_two_id)
);

CREATE INDEX idx_user_chats_user_one_id ON user_chats(user_one_id);
CREATE INDEX idx_user_chats_user_two_id ON user_chats(user_two_id);
CREATE UNIQUE INDEX idx_user_chats_unique_pair ON user_chats(
  LEAST(user_one_id, user_two_id),
  GREATEST(user_one_id, user_two_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES user_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  is_sanitized BOOLEAN DEFAULT FALSE,
  contains_links BOOLEAN DEFAULT FALSE,
  flagged_as_scam BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  CONSTRAINT message_length CHECK (char_length(message_content) <= 500)
);

CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);

CREATE TABLE IF NOT EXISTS escrow_room_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES escrow_trades(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  is_sanitized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT message_length CHECK (char_length(message_content) <= 500)
);

CREATE INDEX idx_escrow_room_chats_escrow_id ON escrow_room_chats(escrow_id, created_at DESC);

-- SECTION 10: SYSTEM TELEMETRY & LOGGING
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_level VARCHAR(50) NOT NULL,
  service_name VARCHAR(255),
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_log_level ON system_logs(log_level);

CREATE TABLE IF NOT EXISTS data_ingestion_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(255) NOT NULL,
  execution_duration_ms BIGINT NOT NULL,
  status_code INTEGER,
  rows_updated BIGINT,
  rows_inserted BIGINT,
  delta_validation_alerts BIGINT,
  server_health_metrics JSONB,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data_ingestion_telemetry_executed_at ON data_ingestion_telemetry(executed_at DESC);

CREATE TABLE IF NOT EXISTS price_index_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  price NUMERIC(15, 2) NOT NULL,
  volume_24h BIGINT DEFAULT 0,
  volume_7d BIGINT DEFAULT 0,
  inflation_multiplier DECIMAL(10, 6),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_price_index_snapshots_recorded_at ON price_index_snapshots(recorded_at DESC);

-- SECTION 11: NOTIFICATIONS
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  message TEXT,
  related_trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id, is_read);
CREATE INDEX idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- SECTION 12: BUNDLES & MULTI-ITEM OFFERS
CREATE TABLE IF NOT EXISTS trade_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bundle_name VARCHAR(255),
  description TEXT,
  total_items INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT max_bundle_items CHECK (total_items <= 15)
);

CREATE TABLE IF NOT EXISTS bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES trade_bundles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_bundle_items_bundle_id ON bundle_items(bundle_id);

-- SECTION 13: ANTI-FRAUD AI SCORES
CREATE TABLE IF NOT EXISTS user_ai_fraud_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  fraud_risk_score DECIMAL(5, 4) DEFAULT 0.0,
  text_analysis_flags JSONB,
  trading_pattern_flags JSONB,
  report_history_weight DECIMAL(5, 4),
  account_age_days INTEGER,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_fraud_score CHECK (fraud_risk_score >= 0.0 AND fraud_risk_score <= 1.0)
);

CREATE INDEX idx_user_ai_fraud_scores_user_id ON user_ai_fraud_scores(user_id);
CREATE INDEX idx_user_ai_fraud_scores_fraud_risk_score ON user_ai_fraud_scores(fraud_risk_score DESC);
