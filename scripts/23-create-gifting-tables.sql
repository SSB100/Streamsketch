-- This migration adds the necessary tables for the viewer rewards feature.

-- Table to track weekly gifting limits for streamers.
CREATE TABLE IF NOT EXISTS "public"."gifting_limits" (
    streamer_wallet_address TEXT PRIMARY KEY NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    lines_gifted_this_week INT NOT NULL DEFAULT 0,
    nukes_gifted_this_week INT NOT NULL DEFAULT 0,
    week_start_date DATE NOT NULL DEFAULT date_trunc('week', CURRENT_DATE)
);

-- Table to store free line credits gifted to users, locked to a specific streamer.
CREATE TABLE IF NOT EXISTS "public"."free_line_credits" (
    user_wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    session_owner_wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    amount INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_wallet_address, session_owner_wallet_address)
);

-- Table to store free nuke credits gifted to users, locked to a specific streamer.
CREATE TABLE IF NOT EXISTS "public"."free_nuke_credits" (
    user_wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    session_owner_wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    amount INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_wallet_address, session_owner_wallet_address)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS free_line_credits_user_idx ON "public"."free_line_credits"(user_wallet_address);
CREATE INDEX IF NOT EXISTS free_nuke_credits_user_idx ON "public"."free_nuke_credits"(user_wallet_address);
