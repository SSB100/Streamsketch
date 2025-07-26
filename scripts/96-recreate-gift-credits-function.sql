-- Drop and recreate the gift_credits_to_session function with proper error handling

-- Drop existing function if it exists (all possible signatures)
DROP FUNCTION IF EXISTS gift_credits_to_session(TEXT, UUID, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS gift_credits_to_session(p_owner_wallet TEXT, p_session_id UUID, p_viewer_wallet TEXT, p_lines_to_gift INTEGER, p_nukes_to_gift INTEGER);

-- Create the gift_credits_to_session function
CREATE OR REPLACE FUNCTION gift_credits_to_session(
    p_owner_wallet TEXT,
    p_session_id UUID,
    p_viewer_wallet TEXT,
    p_lines_to_gift INTEGER,
    p_nukes_to_gift INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_owner TEXT;
    v_session_code TEXT;
    v_session_active BOOLEAN;
BEGIN
    -- Log the function call for debugging
    RAISE NOTICE 'gift_credits_to_session called with: owner=%, session=%, viewer=%, lines=%, nukes=%', 
                 p_owner_wallet, p_session_id, p_viewer_wallet, p_lines_to_gift, p_nukes_to_gift;
    
    -- Validate inputs
    IF p_lines_to_gift < 0 OR p_nukes_to_gift < 0 THEN
        RAISE EXCEPTION 'Cannot gift negative credits';
    END IF;
    
    IF p_lines_to_gift = 0 AND p_nukes_to_gift = 0 THEN
        RAISE EXCEPTION 'Must gift at least one credit';
    END IF;
    
    IF p_owner_wallet IS NULL OR p_owner_wallet = '' THEN
        RAISE EXCEPTION 'Owner wallet address is required';
    END IF;
    
    IF p_viewer_wallet IS NULL OR p_viewer_wallet = '' THEN
        RAISE EXCEPTION 'Viewer wallet address is required';
    END IF;
    
    IF p_session_id IS NULL THEN
        RAISE EXCEPTION 'Session ID is required';
    END IF;
    
    -- Verify session exists, is active, and get session info
    SELECT owner_wallet_address, short_code, is_active 
    INTO v_session_owner, v_session_code, v_session_active
    FROM sessions 
    WHERE id = p_session_id;
    
    IF v_session_owner IS NULL THEN
        RAISE EXCEPTION 'Session not found with ID: %', p_session_id;
    END IF;
    
    IF NOT v_session_active THEN
        RAISE EXCEPTION 'Session % is not active', v_session_code;
    END IF;
    
    IF v_session_owner != p_owner_wallet THEN
        RAISE EXCEPTION 'Only session owner can gift credits. Expected: %, Got: %', v_session_owner, p_owner_wallet;
    END IF;
    
    -- Ensure viewer user exists
    INSERT INTO users (wallet_address) 
    VALUES (p_viewer_wallet) 
    ON CONFLICT (wallet_address) DO NOTHING;
    
    -- Gift line credits if requested
    IF p_lines_to_gift > 0 THEN
        INSERT INTO session_free_line_credits (session_id, user_wallet_address, amount)
        VALUES (p_session_id, p_viewer_wallet, p_lines_to_gift)
        ON CONFLICT (session_id, user_wallet_address)
        DO UPDATE SET 
            amount = session_free_line_credits.amount + p_lines_to_gift,
            updated_at = NOW();
            
        RAISE NOTICE 'Gifted % line credits to % for session %', p_lines_to_gift, p_viewer_wallet, v_session_code;
    END IF;
    
    -- Gift nuke credits if requested
    IF p_nukes_to_gift > 0 THEN
        INSERT INTO session_free_nuke_credits (session_id, user_wallet_address, amount)
        VALUES (p_session_id, p_viewer_wallet, p_nukes_to_gift)
        ON CONFLICT (session_id, user_wallet_address)
        DO UPDATE SET 
            amount = session_free_nuke_credits.amount + p_nukes_to_gift,
            updated_at = NOW();
            
        RAISE NOTICE 'Gifted % nuke credits to % for session %', p_nukes_to_gift, p_viewer_wallet, v_session_code;
    END IF;
    
    -- Return success message
    RETURN format('Successfully gifted %s line credits and %s nuke credits to %s for session %s', 
                  p_lines_to_gift, p_nukes_to_gift, p_viewer_wallet, v_session_code);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION gift_credits_to_session(TEXT, UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION gift_credits_to_session(TEXT, UUID, TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION gift_credits_to_session(TEXT, UUID, TEXT, INTEGER, INTEGER) TO service_role;

-- Test the function exists (fixed ambiguous column reference)
SELECT 'Function created successfully' as status, 
       r.routine_name, 
       string_agg(p.parameter_name || ' ' || p.data_type, ', ' ORDER BY p.ordinal_position) as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_name = 'gift_credits_to_session'
GROUP BY r.routine_name;
