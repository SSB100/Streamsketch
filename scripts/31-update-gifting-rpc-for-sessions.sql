-- This script updates the gifting functions to work with session-specific credits.

-- Function 1: Updated gifting function that requires a session ID
CREATE OR REPLACE FUNCTION gift_credits_to_session(
    p_owner_wallet TEXT,
    p_session_id UUID,
    p_viewer_wallet TEXT,
    p_lines_to_gift INT,
    p_nukes_to_gift INT
)
RETURNS TEXT AS $$
DECLARE
    v_limit_lines INT := 100;
    v_limit_nukes INT := 10;
    v_lines_gifted INT;
    v_nukes_gifted INT;
    v_week_start DATE;
    v_current_week_start_est DATE;
    v_session_owner TEXT;
BEGIN
    -- Verify the session exists and belongs to the owner
    SELECT owner_wallet_address INTO v_session_owner FROM sessions WHERE id = p_session_id;
    IF v_session_owner IS NULL THEN
        RAISE EXCEPTION 'Session not found.';
    END IF;
    IF v_session_owner != p_owner_wallet THEN
        RAISE EXCEPTION 'You can only gift credits for your own sessions.';
    END IF;

    -- Ensure owner and viewer users exist
    INSERT INTO users (wallet_address) VALUES (p_owner_wallet) ON CONFLICT (wallet_address) DO NOTHING;
    INSERT INTO users (wallet_address) VALUES (p_viewer_wallet) ON CONFLICT (wallet_address) DO NOTHING;
    INSERT INTO revenue (streamer_wallet_address) VALUES (p_owner_wallet) ON CONFLICT (streamer_wallet_address) DO NOTHING;
    INSERT INTO revenue (streamer_wallet_address) VALUES (p_viewer_wallet) ON CONFLICT (streamer_wallet_address) DO NOTHING;

    -- Determine the start of the current week (Sunday) in EST
    v_current_week_start_est := (date_trunc('week', (now() AT TIME ZONE 'America/New_York' + interval '1 day')) - interval '1 day')::date;

    -- Check and update the owner's gifting limits for the current week.
    SELECT lines_gifted_this_week, nukes_gifted_this_week, week_start_date
    INTO v_lines_gifted, v_nukes_gifted, v_week_start
    FROM gifting_limits
    WHERE streamer_wallet_address = p_owner_wallet
    FOR UPDATE;

    IF v_week_start IS NULL THEN
        -- First time gifting, create a new limit entry for the current week.
        INSERT INTO gifting_limits (streamer_wallet_address, week_start_date)
        VALUES (p_owner_wallet, v_current_week_start_est)
        ON CONFLICT (streamer_wallet_address) DO UPDATE
        SET week_start_date = v_current_week_start_est, lines_gifted_this_week = 0, nukes_gifted_this_week = 0;
        v_lines_gifted := 0;
        v_nukes_gifted := 0;

    ELSIF v_week_start < v_current_week_start_est THEN
        -- It's a new week, reset the limits.
        v_lines_gifted := 0;
        v_nukes_gifted := 0;
        UPDATE gifting_limits SET
            lines_gifted_this_week = 0,
            nukes_gifted_this_week = 0,
            week_start_date = v_current_week_start_est
        WHERE streamer_wallet_address = p_owner_wallet;
    END IF;

    -- Validate against limits
    IF (v_lines_gifted + p_lines_to_gift > v_limit_lines) THEN
        RAISE EXCEPTION 'Weekly limit for gifting lines (100) exceeded. You have % remaining.', (v_limit_lines - v_lines_gifted);
    END IF;
    IF (v_nukes_gifted + p_nukes_to_gift > v_limit_nukes) THEN
        RAISE EXCEPTION 'Weekly limit for gifting nukes (10) exceeded. You have % remaining.', (v_limit_nukes - v_nukes_gifted);
    END IF;

    -- Grant the credits to the specific session
    IF p_lines_to_gift > 0 THEN
        INSERT INTO session_free_line_credits (user_wallet_address, session_id, amount)
        VALUES (p_viewer_wallet, p_session_id, p_lines_to_gift)
        ON CONFLICT (user_wallet_address, session_id)
        DO UPDATE SET amount = session_free_line_credits.amount + p_lines_to_gift;
    END IF;

    IF p_nukes_to_gift > 0 THEN
        INSERT INTO session_free_nuke_credits (user_wallet_address, session_id, amount)
        VALUES (p_viewer_wallet, p_session_id, p_nukes_to_gift)
        ON CONFLICT (user_wallet_address, session_id)
        DO UPDATE SET amount = session_free_nuke_credits.amount + p_nukes_to_gift;
    END IF;

    -- Update the limits table
    UPDATE gifting_limits SET
        lines_gifted_this_week = lines_gifted_this_week + p_lines_to_gift,
        nukes_gifted_this_week = nukes_gifted_this_week + p_nukes_to_gift
    WHERE streamer_wallet_address = p_owner_wallet;

    RETURN 'Credits gifted successfully to session!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Get free credits for a specific session
CREATE OR REPLACE FUNCTION get_session_free_credits(
    p_user_wallet_address TEXT,
    p_session_id UUID
)
RETURNS TABLE(free_lines INT, free_nukes INT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE((SELECT amount FROM session_free_line_credits WHERE user_wallet_address = p_user_wallet_address AND session_id = p_session_id), 0) AS free_lines,
        COALESCE((SELECT amount FROM session_free_nuke_credits WHERE user_wallet_address = p_user_wallet_address AND session_id = p_session_id), 0) AS free_nukes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Get all sessions where a user has free credits (for dashboard display)
CREATE OR REPLACE FUNCTION get_user_free_credit_sessions(p_user_wallet_address TEXT)
RETURNS TABLE(
    session_id UUID,
    session_code TEXT,
    free_lines INT,
    free_nukes INT,
    granted_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as session_id,
        s.short_code as session_code,
        COALESCE(fl.amount, 0) as free_lines,
        COALESCE(fn.amount, 0) as free_nukes,
        GREATEST(COALESCE(fl.granted_at, '1970-01-01'::timestamptz), COALESCE(fn.granted_at, '1970-01-01'::timestamptz)) as granted_at
    FROM sessions s
    LEFT JOIN session_free_line_credits fl ON s.id = fl.session_id AND fl.user_wallet_address = p_user_wallet_address
    LEFT JOIN session_free_nuke_credits fn ON s.id = fn.session_id AND fn.user_wallet_address = p_user_wallet_address
    WHERE (fl.amount > 0 OR fn.amount > 0)
    AND s.is_active = true
    ORDER BY granted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
