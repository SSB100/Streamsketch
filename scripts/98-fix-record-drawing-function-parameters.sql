-- Fix the record_drawing function parameter order to match the calling code
-- This addresses the "Record drawing RPC error" due to parameter mismatch

DROP FUNCTION IF EXISTS record_drawing(uuid, text, jsonb);
DROP FUNCTION IF EXISTS record_drawing(text, text, jsonb);
DROP FUNCTION IF EXISTS record_drawing(integer, text, jsonb);

-- Create the record_drawing function with correct parameter order
CREATE OR REPLACE FUNCTION record_drawing(
    p_session_id integer,
    p_wallet_address text,
    p_drawing_data jsonb
) RETURNS jsonb AS $$
DECLARE
    v_session_exists boolean;
    v_user_credits integer;
    v_free_lines integer;
    v_free_nukes integer;
    v_credits_used integer := 1;
    v_remaining_credits integer;
BEGIN
    -- Check if session exists and is active
    SELECT EXISTS(
        SELECT 1 FROM sessions 
        WHERE id = p_session_id AND is_active = true
    ) INTO v_session_exists;
    
    IF NOT v_session_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Session not found or inactive'
        );
    END IF;
    
    -- Ensure user exists
    INSERT INTO users (wallet_address) 
    VALUES (p_wallet_address) 
    ON CONFLICT (wallet_address) DO NOTHING;
    
    -- Get user's standard line credits
    SELECT COALESCE(line_credits_standard, 0) 
    FROM users 
    WHERE wallet_address = p_wallet_address 
    INTO v_user_credits;
    
    -- Get user's free credits for this session
    SELECT 
        COALESCE(SUM(CASE WHEN credit_type = 'line' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN credit_type = 'nuke' THEN amount ELSE 0 END), 0)
    FROM session_free_line_credits sflc
    JOIN sessions s ON s.id = sflc.session_id
    WHERE s.id = p_session_id 
    AND sflc.user_wallet_address = p_wallet_address
    INTO v_free_lines, v_free_nukes;
    
    -- Use free credits first, then paid credits
    IF v_free_lines > 0 THEN
        -- Use free credit
        UPDATE session_free_line_credits 
        SET amount = amount - 1
        WHERE session_id = p_session_id 
        AND user_wallet_address = p_wallet_address
        AND credit_type = 'line'
        AND amount > 0;
        
        v_remaining_credits := v_free_lines - 1 + v_user_credits;
    ELSIF v_user_credits > 0 THEN
        -- Use paid credit
        UPDATE users 
        SET line_credits_standard = line_credits_standard - 1
        WHERE wallet_address = p_wallet_address;
        
        v_remaining_credits := v_user_credits - 1 + v_free_lines;
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient credits'
        );
    END IF;
    
    -- Insert the drawing
    INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data, created_at)
    VALUES (p_session_id, p_wallet_address, p_drawing_data, NOW());
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Drawing recorded successfully',
        'credits_used', v_credits_used,
        'credits_remaining', v_remaining_credits
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Database error: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION record_drawing(integer, text, jsonb) TO authenticated, anon;
