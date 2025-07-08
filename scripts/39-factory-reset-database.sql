-- =================================================================
-- StreamSketch - Factory Reset Script
--
-- WARNING: This script will completely WIPE and RESET your database.
-- It drops all existing tables and functions and recreates them
-- from scratch to ensure a clean, consistent state.
--
-- Run this script once to fix any schema/function inconsistencies.
-- =================================================================

-- Step 1: Drop everything in the correct order to avoid dependency errors
DROP TRIGGER IF EXISTS on_new_user_created ON public.users;
DROP FUNCTION IF EXISTS public.create_revenue_entry_for_new_user();
DROP FUNCTION IF EXISTS public.spend_credit_and_draw(TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS public.claim_all_revenue(TEXT);
DROP FUNCTION IF EXISTS public.perform_nuke_cleanup(TEXT, UUID, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS public.add_drawing_segments(UUID, JSONB);
DROP FUNCTION IF EXISTS public.gift_credits_to_session(TEXT, UUID, TEXT, INT, INT);
DROP FUNCTION IF EXISTS public.get_session_free_credits(TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_user_free_credit_sessions(TEXT);
DROP FUNCTION IF EXISTS public.decrement_session_free_nuke_credit(TEXT, UUID);
DROP FUNCTION IF EXISTS public.perform_free_nuke_cleanup(TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_gifting_limits(TEXT);
DROP FUNCTION IF EXISTS public.get_total_free_credits(TEXT);
DROP FUNCTION IF EXISTS public.add_line_credits(TEXT, INT, INT);
DROP FUNCTION IF EXISTS public.add_drawing_segment(TEXT, UUID, JSONB);

DROP TABLE IF EXISTS "public"."session_free_line_credits" CASCADE;
DROP TABLE IF EXISTS "public"."session_free_nuke_credits" CASCADE;
DROP TABLE IF EXISTS "public"."gifting_limits" CASCADE;
DROP TABLE IF EXISTS "public"."drawings" CASCADE;
DROP TABLE IF EXISTS "public"."transactions" CASCADE;
DROP TABLE IF EXISTS "public"."sessions" CASCADE;
DROP TABLE IF EXISTS "public"."revenue" CASCADE;
DROP TABLE IF EXISTS "public"."users" CASCADE;

-- Step 2: Recreate all tables with the final, correct schema
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS "public"."users" (
    wallet_address TEXT PRIMARY KEY NOT NULL,
    username TEXT UNIQUE,
    line_credits_standard INT NOT NULL DEFAULT 0,
    line_credits_discounted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT username_format CHECK (username IS NULL OR (char_length(username) >= 3 AND char_length(username) <= 15 AND username ~ '^[a-zA-Z0-9_]+$'))
);

-- Revenue Table
CREATE TABLE IF NOT EXISTS "public"."revenue" (
    streamer_wallet_address TEXT PRIMARY KEY NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    unclaimed_sol NUMERIC(20, 9) NOT NULL DEFAULT 0,
    total_claimed_sol NUMERIC(20, 9) NOT NULL DEFAULT 0
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS "public"."sessions" (
    id UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    short_code TEXT UNIQUE NOT NULL,
    owner_wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drawings Table
CREATE TABLE IF NOT EXISTS "public"."drawings" (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    drawer_wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
    drawing_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS "public"."transactions" (
    id BIGSERIAL PRIMARY KEY,
    signature TEXT UNIQUE,
    user_wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
    transaction_type TEXT NOT NULL,
    sol_amount NUMERIC(20, 9) NOT NULL,
    credit_amount INT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gifting Limits Table
CREATE TABLE IF NOT EXISTS "public"."gifting_limits" (
    streamer_wallet_address TEXT PRIMARY KEY NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    lines_gifted_this_week INT NOT NULL DEFAULT 0,
    nukes_gifted_this_week INT NOT NULL DEFAULT 0,
    week_start_date DATE NOT NULL DEFAULT date_trunc('week', CURRENT_DATE)
);

-- Session-Specific Free Credits Tables
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS sessions_owner_idx ON sessions(owner_wallet_address);
CREATE INDEX IF NOT EXISTS drawings_session_idx ON drawings(session_id);
CREATE INDEX IF NOT EXISTS transactions_user_idx ON transactions(user_wallet_address);
CREATE INDEX IF NOT EXISTS session_free_line_credits_user_idx ON "public"."session_free_line_credits"(user_wallet_address);
CREATE INDEX IF NOT EXISTS session_free_nuke_credits_user_idx ON "public"."session_free_nuke_credits"(user_wallet_address);

-- Step 3: Recreate all functions and triggers with the final, correct logic

-- Trigger to auto-create revenue entry for new users
CREATE OR REPLACE FUNCTION public.create_revenue_entry_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.revenue (streamer_wallet_address, unclaimed_sol, total_claimed_sol)
    VALUES (NEW.wallet_address, 0, 0)
    ON CONFLICT (streamer_wallet_address) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_user_created
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.create_revenue_entry_for_new_user();

-- Function to spend credits (free or paid) and draw
CREATE OR REPLACE FUNCTION spend_credit_and_draw(p_drawer_wallet_address TEXT, p_session_id UUID, p_drawing_data JSONB)
RETURNS VOID AS $$
DECLARE
    v_streamer_wallet_address TEXT;
    v_free_credits INT;
    v_paid_credits_standard INT;
    v_paid_credits_discounted INT;
    v_revenue_per_line NUMERIC;
    v_streamer_share_rate NUMERIC := 0.8;
    v_streamer_share NUMERIC;
BEGIN
    SELECT owner_wallet_address INTO v_streamer_wallet_address FROM sessions WHERE id = p_session_id;
    IF v_streamer_wallet_address IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;

    SELECT amount INTO v_free_credits FROM session_free_line_credits WHERE user_wallet_address = p_drawer_wallet_address AND session_id = p_session_id FOR UPDATE;

    IF v_free_credits IS NOT NULL AND v_free_credits > 0 THEN
        UPDATE session_free_line_credits SET amount = amount - 1 WHERE user_wallet_address = p_drawer_wallet_address AND session_id = p_session_id;
        INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data) VALUES (p_session_id, p_drawer_wallet_address, p_drawing_data);
        INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes) VALUES (p_drawer_wallet_address, 'draw_line_free', 0, 'Session ID: ' || p_session_id);
        RETURN;
    END IF;

    SELECT line_credits_standard, line_credits_discounted INTO v_paid_credits_standard, v_paid_credits_discounted FROM users WHERE wallet_address = p_drawer_wallet_address FOR UPDATE;

    IF v_paid_credits_standard > 0 THEN
        UPDATE users SET line_credits_standard = line_credits_standard - 1 WHERE wallet_address = p_drawer_wallet_address;
        v_revenue_per_line := 0.002;
    ELSIF v_paid_credits_discounted > 0 THEN
        UPDATE users SET line_credits_discounted = line_credits_discounted - 1 WHERE wallet_address = p_drawer_wallet_address;
        v_revenue_per_line := 0.0015;
    ELSE
        RAISE EXCEPTION 'Insufficient credits';
    END IF;

    INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data) VALUES (p_session_id, p_drawer_wallet_address, p_drawing_data);
    v_streamer_share := v_revenue_per_line * v_streamer_share_rate;
    UPDATE revenue SET unclaimed_sol = unclaimed_sol + v_streamer_share WHERE streamer_wallet_address = v_streamer_wallet_address;
    INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes) VALUES (p_drawer_wallet_address, 'draw_line', v_revenue_per_line, 'Session ID: ' || p_session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- All other necessary functions...
CREATE OR REPLACE FUNCTION claim_all_revenue(p_streamer_wallet_address TEXT)
RETURNS NUMERIC AS $$
DECLARE v_claim_amount NUMERIC;
BEGIN
    SELECT unclaimed_sol INTO v_claim_amount FROM revenue WHERE streamer_wallet_address = p_streamer_wallet_address FOR UPDATE;
    IF v_claim_amount IS NULL OR v_claim_amount <= 0 THEN RETURN 0; END IF;
    UPDATE revenue SET total_claimed_sol = total_claimed_sol + v_claim_amount, unclaimed_sol = 0 WHERE streamer_wallet_address = p_streamer_wallet_address;
    RETURN v_claim_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION perform_nuke_cleanup(p_nuker_wallet_address TEXT, p_session_id UUID, p_revenue_per_nuke NUMERIC, p_streamer_share_rate NUMERIC)
RETURNS VOID AS $$
DECLARE v_streamer_wallet_address TEXT; v_streamer_share NUMERIC;
BEGIN
    DELETE FROM drawings WHERE session_id = p_session_id;
    SELECT owner_wallet_address INTO v_streamer_wallet_address FROM sessions WHERE id = p_session_id;
    v_streamer_share := p_revenue_per_nuke * p_streamer_share_rate;
    UPDATE revenue SET unclaimed_sol = unclaimed_sol + v_streamer_share WHERE streamer_wallet_address = v_streamer_wallet_address;
    INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes) VALUES (p_nuker_wallet_address, 'nuke_board', p_revenue_per_nuke, 'Session ID: ' || p_session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_drawing_segments(p_session_id UUID, p_segments JSONB)
RETURNS VOID AS $$
BEGIN
    INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data)
    SELECT p_session_id, (segment->>'drawer_wallet_address')::TEXT, (segment->'drawing_data')::JSONB
    FROM jsonb_array_elements(p_segments) AS segment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION gift_credits_to_session(p_owner_wallet TEXT, p_session_id UUID, p_viewer_wallet TEXT, p_lines_to_gift INT, p_nukes_to_gift INT)
RETURNS TEXT AS $$
DECLARE
    v_limit_lines INT := 100; v_limit_nukes INT := 10; v_lines_gifted INT; v_nukes_gifted INT; v_week_start DATE;
    v_current_week_start_est DATE; v_session_owner TEXT;
BEGIN
    SELECT owner_wallet_address INTO v_session_owner FROM sessions WHERE id = p_session_id;
    IF v_session_owner IS NULL THEN RAISE EXCEPTION 'Session not found.'; END IF;
    IF v_session_owner != p_owner_wallet THEN RAISE EXCEPTION 'You can only gift credits for your own sessions.'; END IF;
    INSERT INTO users (wallet_address) VALUES (p_owner_wallet) ON CONFLICT (wallet_address) DO NOTHING;
    INSERT INTO users (wallet_address) VALUES (p_viewer_wallet) ON CONFLICT (wallet_address) DO NOTHING;
    v_current_week_start_est := (date_trunc('week', (now() AT TIME ZONE 'America/New_York' + interval '1 day')) - interval '1 day')::date;
    SELECT lines_gifted_this_week, nukes_gifted_this_week, week_start_date INTO v_lines_gifted, v_nukes_gifted, v_week_start FROM gifting_limits WHERE streamer_wallet_address = p_owner_wallet FOR UPDATE;
    IF v_week_start IS NULL THEN
        INSERT INTO gifting_limits (streamer_wallet_address, week_start_date) VALUES (p_owner_wallet, v_current_week_start_est) ON CONFLICT (streamer_wallet_address) DO UPDATE SET week_start_date = v_current_week_start_est, lines_gifted_this_week = 0, nukes_gifted_this_week = 0;
        v_lines_gifted := 0; v_nukes_gifted := 0;
    ELSIF v_week_start < v_current_week_start_est THEN
        v_lines_gifted := 0; v_nukes_gifted := 0;
        UPDATE gifting_limits SET lines_gifted_this_week = 0, nukes_gifted_this_week = 0, week_start_date = v_current_week_start_est WHERE streamer_wallet_address = p_owner_wallet;
    END IF;
    IF (v_lines_gifted + p_lines_to_gift > v_limit_lines) THEN RAISE EXCEPTION 'Weekly line gifting limit exceeded.'; END IF;
    IF (v_nukes_gifted + p_nukes_to_gift > v_limit_nukes) THEN RAISE EXCEPTION 'Weekly nuke gifting limit exceeded.'; END IF;
    IF p_lines_to_gift > 0 THEN INSERT INTO session_free_line_credits (user_wallet_address, session_id, amount) VALUES (p_viewer_wallet, p_session_id, p_lines_to_gift) ON CONFLICT (user_wallet_address, session_id) DO UPDATE SET amount = session_free_line_credits.amount + p_lines_to_gift; END IF;
    IF p_nukes_to_gift > 0 THEN INSERT INTO session_free_nuke_credits (user_wallet_address, session_id, amount) VALUES (p_viewer_wallet, p_session_id, p_nukes_to_gift) ON CONFLICT (user_wallet_address, session_id) DO UPDATE SET amount = session_free_nuke_credits.amount + p_nukes_to_gift; END IF;
    UPDATE gifting_limits SET lines_gifted_this_week = lines_gifted_this_week + p_lines_to_gift, nukes_gifted_this_week = nukes_gifted_this_week + p_nukes_to_gift WHERE streamer_wallet_address = p_owner_wallet;
    RETURN 'Credits gifted successfully!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ... and all the other helper functions
CREATE OR REPLACE FUNCTION get_session_free_credits(p_user_wallet_address TEXT, p_session_id UUID)
RETURNS TABLE(free_lines INT, free_nukes INT) AS $$
BEGIN
    RETURN QUERY SELECT
        COALESCE((SELECT amount FROM session_free_line_credits WHERE user_wallet_address = p_user_wallet_address AND session_id = p_session_id), 0),
        COALESCE((SELECT amount FROM session_free_nuke_credits WHERE user_wallet_address = p_user_wallet_address AND session_id = p_session_id), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_free_credit_sessions(p_user_wallet_address TEXT)
RETURNS TABLE(session_id UUID, session_code TEXT, free_lines INT, free_nukes INT, granted_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY SELECT s.id, s.short_code, COALESCE(fl.amount, 0), COALESCE(fn.amount, 0), GREATEST(COALESCE(fl.granted_at, '1970-01-01'), COALESCE(fn.granted_at, '1970-01-01'))
    FROM sessions s
    LEFT JOIN session_free_line_credits fl ON s.id = fl.session_id AND fl.user_wallet_address = p_user_wallet_address
    LEFT JOIN session_free_nuke_credits fn ON s.id = fn.session_id AND fn.user_wallet_address = p_user_wallet_address
    WHERE (fl.amount > 0 OR fn.amount > 0) AND s.is_active = true ORDER BY granted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_session_free_nuke_credit(p_nuker_wallet_address TEXT, p_session_id UUID)
RETURNS VOID AS $$
DECLARE v_free_nuke_credits INT;
BEGIN
    SELECT amount INTO v_free_nuke_credits FROM session_free_nuke_credits WHERE user_wallet_address = p_nuker_wallet_address AND session_id = p_session_id FOR UPDATE;
    IF v_free_nuke_credits IS NULL OR v_free_nuke_credits < 1 THEN RAISE EXCEPTION 'Insufficient free nuke credits for this session.'; END IF;
    UPDATE session_free_nuke_credits SET amount = amount - 1 WHERE user_wallet_address = p_nuker_wallet_address AND session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION perform_free_nuke_cleanup(p_nuker_wallet_address TEXT, p_session_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM drawings WHERE session_id = p_session_id;
    INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes) VALUES (p_nuker_wallet_address, 'nuke_board_free', 0, 'Session ID: ' || p_session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_gifting_limits(p_streamer_wallet_address TEXT)
RETURNS TABLE(lines_gifted INT, nukes_gifted INT) AS $$
DECLARE v_lines_gifted_val INT; v_nukes_gifted_val INT; v_week_start DATE; v_current_week_start_est DATE;
BEGIN
    v_current_week_start_est := (date_trunc('week', (now() AT TIME ZONE 'America/New_York' + interval '1 day')) - interval '1 day')::date;
    SELECT lines_gifted_this_week, nukes_gifted_this_week, week_start_date INTO v_lines_gifted_val, v_nukes_gifted_val, v_week_start FROM gifting_limits WHERE streamer_wallet_address = p_streamer_wallet_address;
    IF v_week_start IS NULL OR v_week_start < v_current_week_start_est THEN RETURN QUERY SELECT 0, 0;
    ELSE RETURN QUERY SELECT v_lines_gifted_val, v_nukes_gifted_val; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_total_free_credits(p_user_wallet_address TEXT)
RETURNS TABLE(total_free_lines BIGINT, total_free_nukes BIGINT) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE wallet_address = p_user_wallet_address) THEN RETURN QUERY SELECT 0::BIGINT, 0::BIGINT; RETURN; END IF;
    RETURN QUERY SELECT COALESCE(SUM(fl.amount), 0)::BIGINT, COALESCE(SUM(fn.amount), 0)::BIGINT
    FROM users u
    LEFT JOIN session_free_line_credits fl ON u.wallet_address = fl.user_wallet_address
    LEFT JOIN session_free_nuke_credits fn ON u.wallet_address = fn.user_wallet_address
    WHERE u.wallet_address = p_user_wallet_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_line_credits(p_wallet_address TEXT, p_standard_to_add INT, p_discounted_to_add INT)
RETURNS VOID AS $$
BEGIN
    UPDATE users SET line_credits_standard = line_credits_standard + p_standard_to_add, line_credits_discounted = line_credits_discounted + p_discounted_to_add
    WHERE wallet_address = p_wallet_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_drawing_segment(p_drawer_wallet_address TEXT, p_session_id UUID, p_drawing_data JSONB)
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE wallet_address = p_drawer_wallet_address) THEN RAISE EXCEPTION 'User not found.'; END IF;
    INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data) VALUES (p_session_id, p_drawer_wallet_address, p_drawing_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Step 4: Enable Row Level Security and create policies
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."revenue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."drawings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."gifting_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."session_free_line_credits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."session_free_nuke_credits" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to sessions" ON "public"."sessions" FOR SELECT USING (true);
CREATE POLICY "Allow public read access to drawings" ON "public"."drawings" FOR SELECT USING (true);

-- Grant execute permissions on functions to the anon role so the app can call them
GRANT EXECUTE ON FUNCTION public.get_session_free_credits(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_free_credit_sessions(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_total_free_credits(TEXT) TO anon;

SELECT 'Database has been factory reset successfully.';
