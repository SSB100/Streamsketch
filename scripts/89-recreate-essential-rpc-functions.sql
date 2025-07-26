-- Recreate all essential RPC functions that the codebase depends on
-- This script ensures all functions match what app/actions.ts expects

-- Function to record drawing segments
CREATE OR REPLACE FUNCTION record_drawing_segment(
    p_session_id UUID,
    p_drawer_wallet_address TEXT,
    p_drawing_data JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_owner TEXT;
    v_user_standard_credits INT;
    v_user_free_credits INT;
    v_total_credits INT;
BEGIN
    -- Get session owner
    SELECT owner_wallet_address INTO v_session_owner
    FROM sessions 
    WHERE id = p_session_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found or inactive';
    END IF;

    -- Get user's credits
    SELECT line_credits_standard INTO v_user_standard_credits
    FROM users 
    WHERE wallet_address = p_drawer_wallet_address;
    
    IF NOT FOUND THEN
        -- Create user if doesn't exist
        INSERT INTO users (wallet_address, line_credits_standard, line_credits_discounted)
        VALUES (p_drawer_wallet_address, 0, 0);
        v_user_standard_credits := 0;
    END IF;

    -- Get user's free credits for this session
    SELECT COALESCE(amount, 0) INTO v_user_free_credits
    FROM session_free_line_credits
    WHERE session_id = p_session_id AND user_wallet_address = p_drawer_wallet_address;

    v_total_credits := v_user_standard_credits + v_user_free_credits;

    -- Check if user has credits
    IF v_total_credits <= 0 THEN
        RAISE EXCEPTION 'Insufficient credits';
    END IF;

    -- Deduct credits (prefer free credits first)
    IF v_user_free_credits > 0 THEN
        UPDATE session_free_line_credits
        SET amount = amount - 1
        WHERE session_id = p_session_id AND user_wallet_address = p_drawer_wallet_address;
    ELSE
        UPDATE users
        SET line_credits_standard = line_credits_standard - 1
        WHERE wallet_address = p_drawer_wallet_address;
    END IF;

    -- Record the drawing
    INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data)
    VALUES (p_session_id, p_drawer_wallet_address, p_drawing_data);

    -- Update revenue for session owner (if not drawing on own session)
    IF p_drawer_wallet_address != v_session_owner THEN
        INSERT INTO revenue (streamer_wallet_address, unclaimed_sol, total_revenue)
        VALUES (v_session_owner, 0.0001, 0.0001)
        ON CONFLICT (streamer_wallet_address)
        DO UPDATE SET 
            unclaimed_sol = revenue.unclaimed_sol + 0.0001,
            total_revenue = revenue.total_revenue + 0.0001;

        -- Update platform revenue
        INSERT INTO platform_revenue (id, platform_revenue)
        VALUES (1, 0.0001)
        ON CONFLICT (id)
        DO UPDATE SET platform_revenue = platform_revenue.platform_revenue + 0.0001;
    END IF;

    RETURN TRUE;
END;
$$;

-- Function to purchase nuke
CREATE OR REPLACE FUNCTION purchase_nuke(
    p_session_id UUID,
    p_purchaser_wallet_address TEXT,
    p_nuke_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_owner TEXT;
    v_user_standard_credits INT;
    v_user_free_nuke_credits INT;
    v_nuke_cost INT := 10; -- Standard nuke cost
    v_revenue_amount NUMERIC := 0.001; -- Revenue per nuke
BEGIN
    -- Get session owner
    SELECT owner_wallet_address INTO v_session_owner
    FROM sessions 
    WHERE id = p_session_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found or inactive';
    END IF;

    -- Get user's credits
    SELECT line_credits_standard INTO v_user_standard_credits
    FROM users 
    WHERE wallet_address = p_purchaser_wallet_address;
    
    IF NOT FOUND THEN
        -- Create user if doesn't exist
        INSERT INTO users (wallet_address, line_credits_standard, line_credits_discounted)
        VALUES (p_purchaser_wallet_address, 0, 0);
        v_user_standard_credits := 0;
    END IF;

    -- Get user's free nuke credits for this session
    SELECT COALESCE(amount, 0) INTO v_user_free_nuke_credits
    FROM session_free_nuke_credits
    WHERE session_id = p_session_id AND user_wallet_address = p_purchaser_wallet_address;

    -- Check if user has enough credits
    IF v_user_free_nuke_credits > 0 THEN
        -- Use free nuke credit
        UPDATE session_free_nuke_credits
        SET amount = amount - 1
        WHERE session_id = p_session_id AND user_wallet_address = p_purchaser_wallet_address;
    ELSIF v_user_standard_credits >= v_nuke_cost THEN
        -- Use standard credits
        UPDATE users
        SET line_credits_standard = line_credits_standard - v_nuke_cost
        WHERE wallet_address = p_purchaser_wallet_address;
    ELSE
        RAISE EXCEPTION 'Insufficient credits for nuke purchase';
    END IF;

    -- Clear all drawings for this session
    DELETE FROM drawings WHERE session_id = p_session_id;

    -- Update revenue for session owner (if not nuking own session)
    IF p_purchaser_wallet_address != v_session_owner THEN
        INSERT INTO revenue (streamer_wallet_address, unclaimed_sol, total_revenue)
        VALUES (v_session_owner, v_revenue_amount, v_revenue_amount)
        ON CONFLICT (streamer_wallet_address)
        DO UPDATE SET 
            unclaimed_sol = revenue.unclaimed_sol + v_revenue_amount,
            total_revenue = revenue.total_revenue + v_revenue_amount;

        -- Update platform revenue
        INSERT INTO platform_revenue (id, platform_revenue)
        VALUES (1, v_revenue_amount)
        ON CONFLICT (id)
        DO UPDATE SET platform_revenue = platform_revenue.platform_revenue + v_revenue_amount;
    END IF;

    RETURN TRUE;
END;
$$;

-- Function to claim revenue
CREATE OR REPLACE FUNCTION claim_revenue(
    p_streamer_wallet_address TEXT,
    p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_unclaimed_amount NUMERIC;
BEGIN
    -- Get current unclaimed amount
    SELECT unclaimed_sol INTO v_unclaimed_amount
    FROM revenue
    WHERE streamer_wallet_address = p_streamer_wallet_address;

    IF NOT FOUND OR v_unclaimed_amount < p_amount THEN
        RAISE EXCEPTION 'Insufficient unclaimed revenue';
    END IF;

    -- Update revenue record
    UPDATE revenue
    SET 
        unclaimed_sol = unclaimed_sol - p_amount,
        total_claimed = total_claimed + p_amount
    WHERE streamer_wallet_address = p_streamer_wallet_address;

    RETURN TRUE;
END;
$$;

-- Function to get user's total free credits for a session
CREATE OR REPLACE FUNCTION get_user_free_credits(
    p_session_id UUID,
    p_user_wallet_address TEXT
)
RETURNS TABLE(line_credits INT, nuke_credits INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(sflc.amount, 0) as line_credits,
        COALESCE(sfnc.amount, 0) as nuke_credits
    FROM 
        (SELECT p_session_id as session_id, p_user_wallet_address as user_wallet_address) as base
    LEFT JOIN session_free_line_credits sflc ON 
        sflc.session_id = base.session_id AND sflc.user_wallet_address = base.user_wallet_address
    LEFT JOIN session_free_nuke_credits sfnc ON 
        sfnc.session_id = base.session_id AND sfnc.user_wallet_address = base.user_wallet_address;
END;
$$;

-- Function to gift credits to session users
CREATE OR REPLACE FUNCTION gift_credits_to_session(
    p_session_id UUID,
    p_line_credits INT DEFAULT 0,
    p_nuke_credits INT DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_exists BOOLEAN;
BEGIN
    -- Check if session exists and is active
    SELECT EXISTS(
        SELECT 1 FROM sessions 
        WHERE id = p_session_id AND is_active = true
    ) INTO v_session_exists;

    IF NOT v_session_exists THEN
        RAISE EXCEPTION 'Session not found or inactive';
    END IF;

    -- Gift line credits to all users who have drawn in this session
    IF p_line_credits > 0 THEN
        INSERT INTO session_free_line_credits (session_id, user_wallet_address, amount)
        SELECT DISTINCT p_session_id, drawer_wallet_address, p_line_credits
        FROM drawings
        WHERE session_id = p_session_id
        ON CONFLICT (session_id, user_wallet_address)
        DO UPDATE SET amount = session_free_line_credits.amount + p_line_credits;
    END IF;

    -- Gift nuke credits to all users who have drawn in this session
    IF p_nuke_credits > 0 THEN
        INSERT INTO session_free_nuke_credits (session_id, user_wallet_address, amount)
        SELECT DISTINCT p_session_id, drawer_wallet_address, p_nuke_credits
        FROM drawings
        WHERE session_id = p_session_id
        ON CONFLICT (session_id, user_wallet_address)
        DO UPDATE SET amount = session_free_nuke_credits.amount + p_nuke_credits;
    END IF;

    RETURN TRUE;
END;
$$;

-- Function to get leaderboard data
CREATE OR REPLACE FUNCTION get_leaderboard(p_limit INT DEFAULT 10)
RETURNS TABLE(
    wallet_address TEXT,
    username TEXT,
    total_revenue NUMERIC,
    total_drawings BIGINT,
    rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.streamer_wallet_address,
        u.username,
        r.total_revenue,
        COALESCE(drawing_counts.drawing_count, 0) as total_drawings,
        ROW_NUMBER() OVER (ORDER BY r.total_revenue DESC) as rank
    FROM revenue r
    JOIN users u ON u.wallet_address = r.streamer_wallet_address
    LEFT JOIN (
        SELECT 
            s.owner_wallet_address,
            COUNT(d.id) as drawing_count
        FROM sessions s
        LEFT JOIN drawings d ON d.session_id = s.id
        GROUP BY s.owner_wallet_address
    ) drawing_counts ON drawing_counts.owner_wallet_address = r.streamer_wallet_address
    WHERE r.total_revenue > 0
    ORDER BY r.total_revenue DESC
    LIMIT p_limit;
END;
$$;

-- Function to get user rank
CREATE OR REPLACE FUNCTION get_user_rank(p_wallet_address TEXT)
RETURNS TABLE(rank BIGINT, total_revenue NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH ranked_users AS (
        SELECT 
            streamer_wallet_address,
            total_revenue,
            ROW_NUMBER() OVER (ORDER BY total_revenue DESC) as user_rank
        FROM revenue
        WHERE total_revenue > 0
    )
    SELECT 
        ru.user_rank,
        ru.total_revenue
    FROM ranked_users ru
    WHERE ru.streamer_wallet_address = p_wallet_address;
END;
$$;

COMMIT;
