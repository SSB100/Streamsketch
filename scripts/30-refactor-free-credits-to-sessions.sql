-- This migration refactors the free credit system to be session-specific instead of streamer-specific.
-- This makes it clearer for users which session they can use their credits on.

-- Step 1: Drop the old tables that were locked to streamer wallets
DROP TABLE IF EXISTS "public"."free_line_credits";
DROP TABLE IF EXISTS "public"."free_nuke_credits";

-- Step 2: Create new tables that are locked to specific sessions
CREATE TABLE IF NOT EXISTS "public"."session_free_line_credits" (
    user_wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    amount INT NOT NULL DEFAULT 0,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_wallet_address, session_id)
);

CREATE TABLE IF NOT EXISTS "public"."session_free_nuke_credits" (
    user_wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    amount INT NOT NULL DEFAULT 0,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_wallet_address, session_id)
);

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS session_free_line_credits_user_idx ON "public"."session_free_line_credits"(user_wallet_address);
CREATE INDEX IF NOT EXISTS session_free_line_credits_session_idx ON "public"."session_free_line_credits"(session_id);
CREATE INDEX IF NOT EXISTS session_free_nuke_credits_user_idx ON "public"."session_free_nuke_credits"(user_wallet_address);
CREATE INDEX IF NOT EXISTS session_free_nuke_credits_session_idx ON "public"."session_free_nuke_credits"(session_id);
