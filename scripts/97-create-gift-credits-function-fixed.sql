-- Drop existing function if it exists
DROP FUNCTION IF EXISTS gift_credits_to_session(TEXT, INTEGER, TEXT, INTEGER, INTEGER);

-- Create the gift_credits_to_session function with proper error handling
CREATE OR REPLACE FUNCTION gift_credits_to_session(
    p_owner_wallet TEXT,
    p_session_id INTEGER,
    p_viewer_wallet TEXT,
    p_lines_to_gift INTEGER,
    p_nukes_to_gift INTEGER
) RETURNS JSON AS $$
DECLARE
    v_session_exists BOOLEAN;
    v_owner_matches BOOLEAN;
    v_result JSON;
BEGIN
    -- Validate inputs
    IF p_lines_to_gift < 0 OR p_nukes_to_gift < 0 THEN
        RETURN json_build_object('success', false, 'error', 'Cannot gift negative credits');
    END IF;

    IF p_lines_to_gift = 0 AND p_nukes_to_gift = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Must gift at least one credit');
    END IF;

    -- Check if session exists and owner matches
    SELECT EXISTS(SELECT 1 FROM sessions WHERE id = p_session_id),
           EXISTS(SELECT 1 FROM sessions WHERE id = p_session_id AND owner_wallet_address = p_owner_wallet)
    INTO v_session_exists, v_owner_matches;

    IF NOT v_session_exists THEN
        RETURN json_build_object('success', false, 'error', 'Session not found');
    END IF;

    IF NOT v_owner_matches THEN
        RETURN json_build_object('success', false, 'error', 'You are not the owner of this session');
    END IF;

    -- Ensure user exists
    INSERT INTO users (wallet_address) VALUES (p_viewer_wallet) ON CONFLICT (wallet_address) DO NOTHING;

    -- Gift line credits if requested
    IF p_lines_to_gift > 0 THEN
        INSERT INTO session_free_line_credits (session_id, user_wallet_address, amount, granted_by)
        VALUES (p_session_id, p_viewer_wallet, p_lines_to_gift, p_owner_wallet)
        ON CONFLICT (session_id, user_wallet_address)
        DO UPDATE SET 
            amount = session_free_line_credits.amount + p_lines_to_gift,
            granted_at = NOW(),
            granted_by = p_owner_wallet;
    END IF;

    -- Gift nuke credits if requested
    IF p_nukes_to_gift > 0 THEN
        INSERT INTO session_free_nuke_credits (session_id, user_wallet_address, amount, granted_by)
        VALUES (p_session_id, p_viewer_wallet, p_nukes_to_gift, p_owner_wallet)
        ON CONFLICT (session_id, user_wallet_address)
        DO UPDATE SET 
            amount = session_free_nuke_credits.amount + p_nukes_to_gift,
            granted_at = NOW(),
            granted_by = p_owner_wallet;
    END IF;

    -- Build success message
    v_result := json_build_object(
        'success', true,
        'message', format('Successfully gifted %s line credits and %s nuke credits to %s', 
                         p_lines_to_gift, p_nukes_to_gift, p_viewer_wallet)
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION gift_credits_to_session(TEXT, INTEGER, TEXT, INTEGER, INTEGER) TO authenticated, anon, service_role;
