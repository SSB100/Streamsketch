-- Fix the record_drawing function conflict
-- This script removes all conflicting versions and creates a single correct one

-- Drop ALL existing record_drawing functions with any parameter combinations
DROP FUNCTION IF EXISTS record_drawing(TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS record_drawing(UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS record_drawing(p_drawer_wallet_address TEXT, p_session_id UUID, p_drawing_data JSONB);
DROP FUNCTION IF EXISTS record_drawing(p_session_id UUID, p_drawer_wallet_address TEXT, p_drawing_data JSONB);

-- Create the single, correct record_drawing function
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
    v_session_owner TEXT;
    v_revenue_amount NUMERIC(20, 9) := 0.0001; -- Small revenue per line
BEGIN
    -- Ensure user exists
    INSERT INTO users (wallet_address) VALUES (p_drawer_wallet_address) ON CONFLICT DO NOTHING;
    
    -- Get session owner
    SELECT owner_wallet_address INTO v_session_owner
    FROM sessions 
    WHERE id = p_session_id AND is_active = true;
    
    IF v_session_owner IS NULL THEN
        RAISE EXCEPTION 'Session not found or inactive';
    END IF;
    
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
    
    -- Add revenue for session owner (if not drawing on own session)
    IF p_drawer_wallet_address != v_session_owner THEN
        -- Ensure revenue row exists for session owner
        INSERT INTO revenue (streamer_wallet_address) 
        VALUES (v_session_owner) 
        ON CONFLICT DO NOTHING;
        
        -- Update streamer revenue
        UPDATE revenue SET
            unclaimed_sol = unclaimed_sol + v_revenue_amount,
            total_revenue = total_revenue + v_revenue_amount
        WHERE streamer_wallet_address = v_session_owner;
        
        -- Update platform revenue
        INSERT INTO platform_revenue (id, platform_revenue) 
        VALUES (1, v_revenue_amount)
        ON CONFLICT (id) 
        DO UPDATE SET platform_revenue = platform_revenue.platform_revenue + v_revenue_amount;
    END IF;
    
    -- Return the new drawing
    RETURN QUERY
    SELECT d.id, d.session_id, d.drawer_wallet_address, d.drawing_data, d.created_at
    FROM drawings d
    WHERE d.id = v_new_drawing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
