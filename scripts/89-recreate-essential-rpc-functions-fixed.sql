-- StreamSketch Essential RPC Functions Recreation Script (Fixed)
-- This script drops and recreates all RPC functions to avoid return type conflicts

-- Drop all existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS add_line_credits(TEXT, INT, INT);
DROP FUNCTION IF EXISTS record_drawing(TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS claim_all_revenue(TEXT);
DROP FUNCTION IF EXISTS update_transaction_details(UUID, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS perform_nuke_cleanup(TEXT, UUID, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS perform_free_nuke_cleanup(TEXT, UUID);
DROP FUNCTION IF EXISTS gift_credits_to_session(TEXT, UUID, TEXT, INT, INT);
DROP FUNCTION IF EXISTS get_session_free_credits(TEXT, UUID);
DROP FUNCTION IF EXISTS get_user_free_credit_sessions(TEXT);
DROP FUNCTION IF EXISTS get_total_free_credits(TEXT);
DROP FUNCTION IF EXISTS decrement_session_free_nuke_credit(TEXT, UUID);
DROP FUNCTION IF EXISTS get_gifting_limits(TEXT);
DROP FUNCTION IF EXISTS get_leaderboard(INT);
DROP FUNCTION IF EXISTS get_user_rank(TEXT);
DROP FUNCTION IF EXISTS get_admin_stats();

-- 1. Add line credits function
CREATE OR REPLACE FUNCTION add_line_credits(
    p_wallet_address TEXT,
    p_standard_to_add INT DEFAULT 0,
    p_discounted_to_add INT DEFAULT 0
) RETURNS VOID AS $$
BEGIN
    INSERT INTO users (wallet_address, line_credits_standard, line_credits_discounted)
    VALUES (p_wallet_address, p_standard_to_add, p_discounted_to_add)
    ON CONFLICT (wallet_address) 
    DO UPDATE SET 
        line_credits_standard = users.line_credits_standard + p_standard_to_add,
        line_credits_discounted = users.line_credits_discounted + p_discounted_to_add;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Record drawing function
CREATE OR REPLACE FUNCTION record_drawing(
    p_drawer_wallet_address TEXT,
    p_session_id UUID,
    p_drawing_data JSONB
) RETURNS TABLE(
    id BIGINT,
    session_id UUID,
    drawer_wallet_address TEXT,
    drawing_data JSONB,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_has_standard_credits BOOLEAN := FALSE;
    v_has_discounted_credits BOOLEAN := FALSE;
    v_has_free_credits BOOLEAN := FALSE;
    v_new_drawing_id BIGINT;
BEGIN
    -- Ensure user exists
    INSERT INTO users (wallet_address) VALUES (p_drawer_wallet_address) ON CONFLICT DO NOTHING;
    
    -- Check available credits
    SELECT 
        (line_credits_standard > 0),
        (line_credits_discounted > 0)
    INTO v_has_standard_credits, v_has_discounted_credits
    FROM users 
    WHERE wallet_address = p_drawer_wallet_address;
    
    -- Check free credits for this session
    SELECT (amount > 0) INTO v_has_free_credits
    FROM session_free_line_credits 
    WHERE user_wallet_address = p_drawer_wallet_address 
    AND session_id = p_session_id;
    
    -- Must have some type of credit
    IF NOT (v_has_standard_credits OR v_has_discounted_credits OR v_has_free_credits) THEN
        RAISE EXCEPTION 'Insufficient credits to draw';
    END IF;
    
    -- Deduct credits (priority: free > discounted > standard)
    IF v_has_free_credits THEN
        UPDATE session_free_line_credits 
        SET amount = amount - 1 
        WHERE user_wallet_address = p_drawer_wallet_address 
        AND session_id = p_session_id;
    ELSIF v_has_discounted_credits THEN
        UPDATE users 
        SET line_credits_discounted = line_credits_discounted - 1 
        WHERE wallet_address = p_drawer_wallet_address;
    ELSE
        UPDATE users 
        SET line_credits_standard = line_credits_standard - 1 
        WHERE wallet_address = p_drawer_wallet_address;
    END IF;
    
    -- Insert the drawing
    INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data)
    VALUES (p_session_id, p_drawer_wallet_address, p_drawing_data)
    RETURNING drawings.id INTO v_new_drawing_id;
    
    -- Return the new drawing
    RETURN QUERY
    SELECT d.id, d.session_id, d.drawer_wallet_address, d.drawing_data, d.created_at
    FROM drawings d
    WHERE d.id = v_new_drawing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Claim all revenue function
CREATE OR REPLACE FUNCTION claim_all_revenue(
    p_streamer_wallet_address TEXT
) RETURNS UUID AS $$
DECLARE
    v_unclaimed_amount NUMERIC(20, 9);
    v_transaction_id UUID;
BEGIN
    -- Get unclaimed amount
    SELECT unclaimed_sol INTO v_unclaimed_amount
    FROM revenue
    WHERE streamer_wallet_address = p_streamer_wallet_address;
    
    IF v_unclaimed_amount IS NULL OR v_unclaimed_amount <= 0 THEN
        RAISE EXCEPTION 'No revenue to claim';
    END IF;
    
    -- Create transaction record
    INSERT INTO transactions (
        user_wallet_address,
        transaction_type,
        sol_amount,
        notes
    ) VALUES (
        p_streamer_wallet_address,
        'claim_revenue',
        v_unclaimed_amount,
        'Revenue claim'
    ) RETURNING id INTO v_transaction_id;
    
    -- Update revenue table
    UPDATE revenue SET
        unclaimed_sol = 0,
        total_claimed = total_claimed + v_unclaimed_amount
    WHERE streamer_wallet_address = p_streamer_wallet_address;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update transaction details function
CREATE OR REPLACE FUNCTION update_transaction_details(
    p_transaction_id UUID,
    p_signature TEXT,
    p_fee NUMERIC(20, 9)
) RETURNS VOID AS $$
BEGIN
    UPDATE transactions SET
        signature = p_signature,
        fee = p_fee
    WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Perform nuke cleanup function
CREATE OR REPLACE FUNCTION perform_nuke_cleanup(
    p_nuker_wallet_address TEXT,
    p_session_id UUID,
    p_revenue_per_nuke NUMERIC(20, 9),
    p_streamer_share_rate NUMERIC(3, 2)
) RETURNS VOID AS $$
DECLARE
    v_session_owner TEXT;
    v_streamer_share NUMERIC(20, 9);
    v_platform_share NUMERIC(20, 9);
BEGIN
    -- Get session owner
    SELECT owner_wallet_address INTO v_session_owner
    FROM sessions
    WHERE id = p_session_id;
    
    IF v_session_owner IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;
    
    -- Calculate shares
    v_streamer_share := p_revenue_per_nuke * p_streamer_share_rate;
    v_platform_share := p_revenue_per_nuke - v_streamer_share;
    
    -- Clear all drawings for this session
    DELETE FROM drawings WHERE session_id = p_session_id;
    
    -- Ensure revenue row exists for streamer
    INSERT INTO revenue (streamer_wallet_address) 
    VALUES (v_session_owner) 
    ON CONFLICT DO NOTHING;
    
    -- Update streamer revenue
    UPDATE revenue SET
        unclaimed_sol = unclaimed_sol + v_streamer_share,
        total_revenue = total_revenue + v_streamer_share
    WHERE streamer_wallet_address = v_session_owner;
    
    -- Update platform revenue
    UPDATE platform_revenue SET
        platform_revenue = platform_revenue + v_platform_share
    WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Perform free nuke cleanup function
CREATE OR REPLACE FUNCTION perform_free_nuke_cleanup(
    p_nuker_wallet_address TEXT,
    p_session_id UUID
) RETURNS VOID AS $$
BEGIN
    -- Clear all drawings for this session
    DELETE FROM drawings WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Gift credits to session function
CREATE OR REPLACE FUNCTION gift_credits_to_session(
    p_owner_wallet TEXT,
    p_session_id UUID,
    p_viewer_wallet TEXT,
    p_lines_to_gift INT,
    p_nukes_to_gift INT
) RETURNS TEXT AS $$
DECLARE
    v_available_lines INT;
    v_available_nukes INT;
    v_current_gifted_lines INT;
    v_current_gifted_nukes INT;
BEGIN
    -- Check if owner has enough credits
    SELECT 
        (line_credits_standard + line_credits_discounted)
    INTO v_available_lines
    FROM users
    WHERE wallet_address = p_owner_wallet;
    
    IF v_available_lines < p_lines_to_gift THEN
        RAISE EXCEPTION 'Insufficient line credits to gift';
    END IF;
    
    -- Deduct credits from owner (prefer discounted first)
    UPDATE users SET
        line_credits_discounted = GREATEST(0, line_credits_discounted - p_lines_to_gift),
        line_credits_standard = CASE 
            WHEN line_credits_discounted >= p_lines_to_gift THEN line_credits_standard
            ELSE line_credits_standard - (p_lines_to_gift - line_credits_discounted)
        END
    WHERE wallet_address = p_owner_wallet;
    
    -- Ensure viewer exists
    INSERT INTO users (wallet_address) VALUES (p_viewer_wallet) ON CONFLICT DO NOTHING;
    
    -- Add free line credits for viewer
    IF p_lines_to_gift > 0 THEN
        INSERT INTO session_free_line_credits (session_id, user_wallet_address, amount)
        VALUES (p_session_id, p_viewer_wallet, p_lines_to_gift)
        ON CONFLICT (session_id, user_wallet_address)
        DO UPDATE SET amount = session_free_line_credits.amount + p_lines_to_gift;
    END IF;
    
    -- Add free nuke credits for viewer
    IF p_nukes_to_gift > 0 THEN
        INSERT INTO session_free_nuke_credits (session_id, user_wallet_address, amount)
        VALUES (p_session_id, p_viewer_wallet, p_nukes_to_gift)
        ON CONFLICT (session_id, user_wallet_address)
        DO UPDATE SET amount = session_free_nuke_credits.amount + p_nukes_to_gift;
    END IF;
    
    RETURN format('Successfully gifted %s lines and %s nukes', p_lines_to_gift, p_nukes_to_gift);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Get session free credits function
CREATE OR REPLACE FUNCTION get_session_free_credits(
    p_user_wallet_address TEXT,
    p_session_id UUID
) RETURNS TABLE(
    free_lines INT,
    free_nukes INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(l.amount, 0) as free_lines,
        COALESCE(n.amount, 0) as free_nukes
    FROM (SELECT 1) dummy
    LEFT JOIN session_free_line_credits l ON l.user_wallet_address = p_user_wallet_address AND l.session_id = p_session_id
    LEFT JOIN session_free_nuke_credits n ON n.user_wallet_address = p_user_wallet_address AND n.session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Get user free credit sessions function
CREATE OR REPLACE FUNCTION get_user_free_credit_sessions(
    p_user_wallet_address TEXT
) RETURNS TABLE(
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
        COALESCE(l.amount, 0) as free_lines,
        COALESCE(n.amount, 0) as free_nukes,
        GREATEST(COALESCE(l.created_at, '1970-01-01'::timestamptz), COALESCE(n.created_at, '1970-01-01'::timestamptz)) as granted_at
    FROM sessions s
    LEFT JOIN session_free_line_credits l ON l.session_id = s.id AND l.user_wallet_address = p_user_wallet_address
    LEFT JOIN session_free_nuke_credits n ON n.session_id = s.id AND n.user_wallet_address = p_user_wallet_address
    WHERE s.is_active = true 
    AND (l.amount > 0 OR n.amount > 0)
    ORDER BY granted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Get total free credits function
CREATE OR REPLACE FUNCTION get_total_free_credits(
    p_user_wallet_address TEXT
) RETURNS TABLE(
    total_free_lines BIGINT,
    total_free_nukes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(l.amount), 0) as total_free_lines,
        COALESCE(SUM(n.amount), 0) as total_free_nukes
    FROM sessions s
    LEFT JOIN session_free_line_credits l ON l.session_id = s.id AND l.user_wallet_address = p_user_wallet_address
    LEFT JOIN session_free_nuke_credits n ON n.session_id = s.id AND n.user_wallet_address = p_user_wallet_address
    WHERE s.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Decrement session free nuke credit function
CREATE OR REPLACE FUNCTION decrement_session_free_nuke_credit(
    p_nuker_wallet_address TEXT,
    p_session_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE session_free_nuke_credits 
    SET amount = amount - 1
    WHERE user_wallet_address = p_nuker_wallet_address 
    AND session_id = p_session_id
    AND amount > 0;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No free nuke credits available for this session';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Get gifting limits function
CREATE OR REPLACE FUNCTION get_gifting_limits(
    p_streamer_wallet_address TEXT
) RETURNS TABLE(
    lines_gifted INT,
    nukes_gifted INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(l.amount), 0)::INT as lines_gifted,
        COALESCE(SUM(n.amount), 0)::INT as nukes_gifted
    FROM sessions s
    LEFT JOIN session_free_line_credits l ON l.session_id = s.id
    LEFT JOIN session_free_nuke_credits n ON n.session_id = s.id
    WHERE s.owner_wallet_address = p_streamer_wallet_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Get leaderboard function
CREATE OR REPLACE FUNCTION get_leaderboard(
    p_limit INT DEFAULT 10
) RETURNS TABLE(
    wallet_address TEXT,
    username TEXT,
    total_earnings NUMERIC(20, 9),
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.wallet_address,
        u.username,
        COALESCE(r.total_claimed + r.unclaimed_sol, 0) as total_earnings,
        ROW_NUMBER() OVER (ORDER BY COALESCE(r.total_claimed + r.unclaimed_sol, 0) DESC) as rank
    FROM users u
    LEFT JOIN revenue r ON r.streamer_wallet_address = u.wallet_address
    WHERE COALESCE(r.total_claimed + r.unclaimed_sol, 0) > 0
    ORDER BY total_earnings DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Get user rank function
CREATE OR REPLACE FUNCTION get_user_rank(
    p_wallet_address TEXT
) RETURNS TABLE(
    user_rank BIGINT,
    total_earnings NUMERIC(20, 9),
    total_users_with_earnings BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_users AS (
        SELECT 
            u.wallet_address,
            COALESCE(r.total_claimed + r.unclaimed_sol, 0) as earnings,
            ROW_NUMBER() OVER (ORDER BY COALESCE(r.total_claimed + r.unclaimed_sol, 0) DESC) as rank
        FROM users u
        LEFT JOIN revenue r ON r.streamer_wallet_address = u.wallet_address
        WHERE COALESCE(r.total_claimed + r.unclaimed_sol, 0) > 0
    )
    SELECT 
        COALESCE(ru.rank, 0) as user_rank,
        COALESCE(ru.earnings, 0) as total_earnings,
        (SELECT COUNT(*) FROM ranked_users) as total_users_with_earnings
    FROM ranked_users ru
    WHERE ru.wallet_address = p_wallet_address
    UNION ALL
    SELECT 0::BIGINT, 0::NUMERIC(20, 9), (SELECT COUNT(*) FROM ranked_users)
    WHERE NOT EXISTS (SELECT 1 FROM ranked_users WHERE wallet_address = p_wallet_address)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
