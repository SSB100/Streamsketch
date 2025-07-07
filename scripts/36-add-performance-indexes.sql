-- High-impact database indexes for better query performance
-- These are free and will significantly speed up common queries

-- Index for drawings by session and creation time (for canvas loading)
CREATE INDEX IF NOT EXISTS drawings_session_created_idx 
ON drawings(session_id, created_at);

-- Index for drawings by session only (for counting/aggregation)
CREATE INDEX IF NOT EXISTS drawings_session_idx 
ON drawings(session_id);

-- Composite index for users with credits (for dashboard queries)
CREATE INDEX IF NOT EXISTS users_wallet_credits_idx 
ON users(wallet_address);

-- Index for revenue queries (for claim operations)
CREATE INDEX IF NOT EXISTS revenue_wallet_amounts_idx 
ON revenue(streamer_wallet_address);

-- Index for transactions by user and type (for transaction history)
CREATE INDEX IF NOT EXISTS transactions_user_type_created_idx 
ON transactions(user_wallet_address, transaction_type, created_at DESC);

-- Index for sessions by owner (for dashboard session list)
CREATE INDEX IF NOT EXISTS sessions_owner_active_created_idx 
ON sessions(owner_wallet_address, is_active, created_at DESC);

-- Index for free credits by user (for credit lookups)
CREATE INDEX IF NOT EXISTS session_free_line_credits_user_session_idx 
ON session_free_line_credits(user_wallet_address, session_id);

CREATE INDEX IF NOT EXISTS session_free_nuke_credits_user_session_idx 
ON session_free_nuke_credits(user_wallet_address, session_id);

-- Index for gifting limits (for weekly limit checks)
CREATE INDEX IF NOT EXISTS gifting_limits_streamer_week_idx 
ON gifting_limits(streamer_wallet_address, week_start_date);

-- Additional performance indexes for common queries
CREATE INDEX IF NOT EXISTS drawings_drawer_session_idx 
ON drawings(drawer_wallet_address, session_id);

CREATE INDEX IF NOT EXISTS transactions_signature_idx 
ON transactions(signature) WHERE signature IS NOT NULL;

-- Index for active sessions only
CREATE INDEX IF NOT EXISTS sessions_active_created_idx 
ON sessions(created_at DESC) WHERE is_active = true;
