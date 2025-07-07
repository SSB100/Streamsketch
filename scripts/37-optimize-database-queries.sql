-- Add more specific indexes to speed up the slow queries we're seeing

-- Optimize user data queries (the main bottleneck)
CREATE INDEX IF NOT EXISTS users_wallet_credits_username_idx 
ON users(wallet_address, line_credits_standard, line_credits_discounted, username);

-- Optimize revenue queries
CREATE INDEX IF NOT EXISTS revenue_streamer_amounts_idx 
ON revenue(streamer_wallet_address, unclaimed_sol, total_claimed_sol);

-- Optimize free credits queries
CREATE INDEX IF NOT EXISTS session_free_line_credits_user_amount_idx 
ON session_free_line_credits(user_wallet_address, amount) WHERE amount > 0;

CREATE INDEX IF NOT EXISTS session_free_nuke_credits_user_amount_idx 
ON session_free_nuke_credits(user_wallet_address, amount) WHERE amount > 0;

-- Optimize gifting limits queries
CREATE INDEX IF NOT EXISTS gifting_limits_streamer_week_amounts_idx 
ON gifting_limits(streamer_wallet_address, week_start_date, lines_gifted_this_week, nukes_gifted_this_week);

-- Add partial indexes for active sessions only
CREATE INDEX IF NOT EXISTS sessions_active_owner_created_idx 
ON sessions(owner_wallet_address, created_at DESC) WHERE is_active = true;

-- Optimize drawing queries for session loading
CREATE INDEX IF NOT EXISTS drawings_session_id_asc_idx 
ON drawings(session_id, id ASC);

-- Add covering index for transaction history
CREATE INDEX IF NOT EXISTS transactions_user_history_idx 
ON transactions(user_wallet_address, created_at DESC, transaction_type, sol_amount, signature);
