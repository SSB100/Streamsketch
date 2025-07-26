-- Remove gifting limits for session owners
-- This allows unlimited gifting of lines and nukes to viewers

-- Drop the existing gifting function that has limits
DROP FUNCTION IF EXISTS gift_credits_to_session(TEXT, UUID, TEXT, INT, INT);

-- Recreate the gifting function without limits
CREATE OR REPLACE FUNCTION gift_credits_to_session(
    p_owner_wallet TEXT,
    p_session_id UUID,
    p_viewer_wallet TEXT,
    p_lines_to_gift INT,
    p_nukes_to_gift INT
)
RETURNS TEXT AS $$
DECLARE
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

    -- Grant the credits to the specific session (no limits check)
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

    -- Update the limits table (but don't enforce limits anymore)
    INSERT INTO gifting_limits (streamer_wallet_address, lines_gifted_this_week, nukes_gifted_this_week)
    VALUES (p_owner_wallet, p_lines_to_gift, p_nukes_to_gift)
    ON CONFLICT (streamer_wallet_address) 
    DO UPDATE SET
        lines_gifted_this_week = gifting_limits.lines_gifted_this_week + p_lines_to_gift,
        nukes_gifted_this_week = gifting_limits.nukes_gifted_this_week + p_nukes_to_gift;

    RETURN 'Credits gifted successfully to session!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_gifting_limits function to still return stats but without enforcing limits
CREATE OR REPLACE FUNCTION get_gifting_limits(p_streamer_wallet_address TEXT)
RETURNS TABLE(lines_gifted INT, nukes_gifted INT) AS $$
DECLARE
    v_current_week_start_est DATE;
BEGIN
    -- Determine the start of the current week (Sunday) in EST
    v_current_week_start_est := (date_trunc('week', (now() AT TIME ZONE 'America/New_York' + interval '1 day')) - interval '1 day')::date;

    -- Get or create gifting limits record
    INSERT INTO gifting_limits (streamer_wallet_address, week_start_date)
    VALUES (p_streamer_wallet_address, v_current_week_start_est)
    ON CONFLICT (streamer_wallet_address) DO UPDATE
    SET week_start_date = CASE 
        WHEN gifting_limits.week_start_date < v_current_week_start_est THEN v_current_week_start_est
        ELSE gifting_limits.week_start_date
    END,
    lines_gifted_this_week = CASE 
        WHEN gifting_limits.week_start_date < v_current_week_start_est THEN 0
        ELSE gifting_limits.lines_gifted_this_week
    END,
    nukes_gifted_this_week = CASE 
        WHEN gifting_limits.week_start_date < v_current_week_start_est THEN 0
        ELSE gifting_limits.nukes_gifted_this_week
    END;

    -- Return the current week's gifting stats (for display purposes only)
    RETURN QUERY
    SELECT 
        gl.lines_gifted_this_week as lines_gifted,
        gl.nukes_gifted_this_week as nukes_gifted
    FROM gifting_limits gl
    WHERE gl.streamer_wallet_address = p_streamer_wallet_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION gift_credits_to_session(TEXT, UUID, TEXT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION gift_credits_to_session(TEXT, UUID, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_gifting_limits(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_gifting_limits(TEXT) TO authenticated;
