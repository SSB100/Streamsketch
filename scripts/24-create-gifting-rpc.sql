-- This function handles the logic for a streamer gifting credits to a viewer.
-- It checks weekly limits, ensures the viewer exists, and grants the credits.

CREATE OR REPLACE FUNCTION gift_credits(
    p_owner_wallet TEXT,
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
BEGIN
    -- Ensure owner and viewer users exist, creating them if necessary.
    -- This is a simplified upsert logic. A more robust version might be a separate function.
    INSERT INTO users (wallet_address) VALUES (p_owner_wallet) ON CONFLICT (wallet_address) DO NOTHING;
    INSERT INTO users (wallet_address) VALUES (p_viewer_wallet) ON CONFLICT (wallet_address) DO NOTHING;
    INSERT INTO revenue (streamer_wallet_address) VALUES (p_owner_wallet) ON CONFLICT (streamer_wallet_address) DO NOTHING;
    INSERT INTO revenue (streamer_wallet_address) VALUES (p_viewer_wallet) ON CONFLICT (streamer_wallet_address) DO NOTHING;


    -- Check and update the owner's gifting limits for the current week.
    SELECT lines_gifted_this_week, nukes_gifted_this_week, week_start_date
    INTO v_lines_gifted, v_nukes_gifted, v_week_start
    FROM gifting_limits
    WHERE streamer_wallet_address = p_owner_wallet
    FOR UPDATE;

    IF v_week_start IS NULL THEN
        -- First time gifting, create a new limit entry.
        INSERT INTO gifting_limits (streamer_wallet_address) VALUES (p_owner_wallet);
        v_lines_gifted := 0;
        v_nukes_gifted := 0;
        v_week_start := date_trunc('week', CURRENT_DATE);
    ELSIF v_week_start < date_trunc('week', CURRENT_DATE) THEN
        -- It's a new week, reset the limits.
        v_lines_gifted := 0;
        v_nukes_gifted := 0;
        UPDATE gifting_limits SET
            lines_gifted_this_week = 0,
            nukes_gifted_this_week = 0,
            week_start_date = date_trunc('week', CURRENT_DATE)
        WHERE streamer_wallet_address = p_owner_wallet;
    END IF;

    -- Validate against limits
    IF (v_lines_gifted + p_lines_to_gift > v_limit_lines) THEN
        RAISE EXCEPTION 'Weekly limit for gifting lines (100) exceeded. You have % remaining.', (v_limit_lines - v_lines_gifted);
    END IF;
    IF (v_nukes_gifted + p_nukes_to_gift > v_limit_nukes) THEN
        RAISE EXCEPTION 'Weekly limit for gifting nukes (10) exceeded. You have % remaining.', (v_limit_nukes - v_nukes_gifted);
    END IF;

    -- Grant the credits
    IF p_lines_to_gift > 0 THEN
        INSERT INTO free_line_credits (user_wallet_address, session_owner_wallet_address, amount)
        VALUES (p_viewer_wallet, p_owner_wallet, p_lines_to_gift)
        ON CONFLICT (user_wallet_address, session_owner_wallet_address)
        DO UPDATE SET amount = free_line_credits.amount + p_lines_to_gift;
    END IF;

    IF p_nukes_to_gift > 0 THEN
        INSERT INTO free_nuke_credits (user_wallet_address, session_owner_wallet_address, amount)
        VALUES (p_viewer_wallet, p_owner_wallet, p_nukes_to_gift)
        ON CONFLICT (user_wallet_address, session_owner_wallet_address)
        DO UPDATE SET amount = free_nuke_credits.amount + p_nukes_to_gift;
    END IF;

    -- Update the limits table
    UPDATE gifting_limits SET
        lines_gifted_this_week = lines_gifted_this_week + p_lines_to_gift,
        nukes_gifted_this_week = nukes_gifted_this_week + p_nukes_to_gift
    WHERE streamer_wallet_address = p_owner_wallet;

    RETURN 'Credits gifted successfully!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
