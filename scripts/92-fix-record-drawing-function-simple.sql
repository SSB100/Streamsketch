-- Fix the record_drawing function to return proper JSON format
CREATE OR REPLACE FUNCTION record_drawing(
    p_session_id INTEGER,
    p_wallet_address TEXT,
    p_drawing_data JSONB
) RETURNS JSON[] AS $$
DECLARE
    v_session_exists BOOLEAN;
    v_credits_used INTEGER := 1;
    v_remaining_standard INTEGER := 0;
    v_remaining_discounted INTEGER := 0;
    v_remaining_free INTEGER := 0;
    v_new_drawing_id INTEGER;
    v_result JSON[];
BEGIN
    -- Check if session exists
    SELECT EXISTS(SELECT 1 FROM sessions WHERE id = p_session_id AND is_active = true)
    INTO v_session_exists;

    IF NOT v_session_exists THEN
        RETURN ARRAY[json_build_object('success', false, 'message', 'Session not found or inactive')];
    END IF;

    -- Ensure user exists
    INSERT INTO users (wallet_address) VALUES (p_wallet_address) ON CONFLICT (wallet_address) DO NOTHING;

    -- Try to use free credits first
    UPDATE session_free_line_credits 
    SET amount = amount - 1 
    WHERE session_id = p_session_id 
      AND user_wallet_address = p_wallet_address 
      AND amount > 0;

    IF FOUND THEN
        -- Used free credit
        SELECT amount INTO v_remaining_free 
        FROM session_free_line_credits 
        WHERE session_id = p_session_id AND user_wallet_address = p_wallet_address;
    ELSE
        -- Try to use paid credits
        UPDATE users 
        SET line_credits_discounted = CASE 
            WHEN line_credits_discounted > 0 THEN line_credits_discounted - 1 
            ELSE line_credits_discounted 
        END,
        line_credits_standard = CASE 
            WHEN line_credits_discounted = 0 AND line_credits_standard > 0 THEN line_credits_standard - 1 
            ELSE line_credits_standard 
        END
        WHERE wallet_address = p_wallet_address 
          AND (line_credits_standard > 0 OR line_credits_discounted > 0);

        IF NOT FOUND THEN
            RETURN ARRAY[json_build_object('success', false, 'message', 'Insufficient credits')];
        END IF;

        -- Get remaining paid credits
        SELECT line_credits_standard, line_credits_discounted 
        INTO v_remaining_standard, v_remaining_discounted
        FROM users WHERE wallet_address = p_wallet_address;
    END IF;

    -- Insert the drawing
    INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data)
    VALUES (p_session_id, p_wallet_address, p_drawing_data)
    RETURNING id INTO v_new_drawing_id;

    -- Log the transaction
    INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
    VALUES (p_wallet_address, 'draw_line', 0, format('Drew line in session %s', p_session_id));

    -- Return success with drawing info
    RETURN ARRAY[json_build_object(
        'success', true,
        'message', 'Drawing recorded successfully',
        'credits_used', v_credits_used,
        'credits_remaining', v_remaining_standard + v_remaining_discounted + COALESCE(v_remaining_free, 0),
        'drawing_id', v_new_drawing_id
    )];

EXCEPTION WHEN OTHERS THEN
    RETURN ARRAY[json_build_object('success', false, 'message', SQLERRM)];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION record_drawing(INTEGER, TEXT, JSONB) TO authenticated, anon, service_role;
