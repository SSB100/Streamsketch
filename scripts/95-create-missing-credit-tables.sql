-- Create missing credit tables if they don't exist
CREATE TABLE IF NOT EXISTS session_free_line_credits (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_wallet_address TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by TEXT NOT NULL,
    UNIQUE(session_id, user_wallet_address)
);

CREATE TABLE IF NOT EXISTS session_free_nuke_credits (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_wallet_address TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by TEXT NOT NULL,
    UNIQUE(session_id, user_wallet_address)
);

-- Enable RLS
ALTER TABLE session_free_line_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_free_nuke_credits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own free line credits" ON session_free_line_credits
    FOR SELECT USING (user_wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can view their own free nuke credits" ON session_free_nuke_credits
    FOR SELECT USING (user_wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON session_free_line_credits TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON session_free_nuke_credits TO authenticated, anon, service_role;
GRANT USAGE ON SEQUENCE session_free_line_credits_id_seq TO authenticated, anon, service_role;
GRANT USAGE ON SEQUENCE session_free_nuke_credits_id_seq TO authenticated, anon, service_role;
