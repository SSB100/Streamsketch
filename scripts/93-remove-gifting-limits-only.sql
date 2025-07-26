-- Remove gifting limits for session owners
-- This script ONLY modifies the gift_credits_to_session function to remove limits

CREATE OR REPLACE FUNCTION gift_credits_to_session(
    p_session_id UUID,
    p_gifter_wallet_address TEXT,
    p_line_credits INTEGER DEFAULT 0,
    p_nuke_credits INTEGER DEFAULT 0
) RETURNS JSON AS $$
DECLARE
    v_session_owner TEXT;
    v_result JSON;
BEGIN
    -- Get session owner
    SELECT owner_wallet_address INTO v_session_owner
    FROM sessions 
    WHERE sessions.id = p_session_id AND sessions.is_active = true;
    
    IF v_session_owner IS NULL THEN
        RAISE EXCEPTION 'Session not found or inactive';
    END IF;
    
    -- Only session owner can gift credits
    IF p_gifter_wallet_address != v_session_owner THEN
        RAISE EXCEPTION 'Only session owner can gift credits';
    END IF;
    
    -- Gift line credits (no limits)
    IF p_line_credits > 0 THEN
        INSERT INTO session_free_line_credits (session_id, user_wallet_address, amount)
        SELECT p_session_id, users.wallet_address, p_line_credits
        FROM users
        WHERE users.wallet_address != v_session_owner
        ON CONFLICT (session_id, user_wallet_address)
        DO UPDATE SET amount = session_free_line_credits.amount + p_line_credits;
    END IF;
    
    -- Gift nuke credits (no limits)
    IF p_nuke_credits > 0 THEN
        INSERT INTO session_free_nuke_credits (session_id, user_wallet_address, amount)
        SELECT p_session_id, users.wallet_address, p_nuke_credits
        FROM users
        WHERE users.wallet_address != v_session_owner
        ON CONFLICT (session_id, user_wallet_address)
        DO UPDATE SET amount = session_free_nuke_credits.amount + p_nuke_credits;
    END IF;
    
    -- Return success with gifted amounts
    v_result := json_build_object(
        'success', true,
        'line_credits_gifted', p_line_credits,
        'nuke_credits_gifted', p_nuke_credits,
        'message', 'Credits gifted successfully - no limits!'
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
