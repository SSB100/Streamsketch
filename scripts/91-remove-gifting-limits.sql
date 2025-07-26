-- Remove gifting limits for session owners
-- This script allows unlimited gifting of lines and nukes

-- Drop and recreate the gift_credits_to_session function without limits
DROP FUNCTION IF EXISTS gift_credits_to_session(TEXT, UUID, TEXT, INT, INT);

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
BEGIN
    -- Validate inputs
    IF p_lines_to_gift < 0 OR p_nukes_to_gift < 0 THEN
        RAISE EXCEPTION 'Cannot gift negative credits';
    END IF;
    
    IF p_lines_to_gift = 0 AND p_nukes_to_gift = 0 THEN
        RAISE EXCEPTION 'Must gift at least one credit';
    END IF;

    -- Check if owner has enough credits for lines
    IF p_lines_to_gift > 0 THEN
        SELECT (line_credits_standard + line_credits_discounted)
        INTO v_available_lines
        FROM users
        WHERE wallet_address = p_owner_wallet;
        
        IF v_available_lines < p_lines_to_gift THEN
            RAISE EXCEPTION 'Insufficient line credits to gift (have: %, need: %)', v_available_lines, p_lines_to_gift;
        END IF;
        
        -- Deduct credits from owner (prefer discounted first)
        UPDATE users SET
            line_credits_discounted = GREATEST(0, line_credits_discounted - p_lines_to_gift),
            line_credits_standard = CASE 
                WHEN line_credits_discounted >= p_lines_to_gift THEN line_credits_standard
                ELSE line_credits_standard - (p_lines_to_gift - line_credits_discounted)
            END
        WHERE wallet_address = p_owner_wallet;
    END IF;
    
    -- Ensure viewer exists
    INSERT INTO users (wallet_address) VALUES (p_viewer_wallet) ON CONFLICT DO NOTHING;
    
    -- Add free line credits for viewer
    IF p_lines_to_gift > 0 THEN
        INSERT INTO session_free_line_credits (session_id, user_wallet_address, amount)
        VALUES (p_session_id, p_viewer_wallet, p_lines_to_gift)
        ON CONFLICT (session_id, user_wallet_address)
        DO UPDATE SET amount = session_free_line_credits.amount + p_lines_to_gift;
    END IF;
    
    -- Add free nuke credits for viewer (no limits, no deduction from owner)
    IF p_nukes_to_gift > 0 THEN
        INSERT INTO session_free_nuke_credits (session_id, user_wallet_address, amount)
        VALUES (p_session_id, p_viewer_wallet, p_nukes_to_gift)
        ON CONFLICT (session_id, user_wallet_address)
        DO UPDATE SET amount = session_free_nuke_credits.amount + p_nukes_to_gift;
    END IF;
    
    RETURN format('Successfully gifted %s lines and %s nukes to %s', p_lines_to_gift, p_nukes_to_gift, p_viewer_wallet);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
