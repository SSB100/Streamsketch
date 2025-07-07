-- This script ensures the get_session_free_credits function exists and works correctly

-- Drop and recreate the function to ensure it's working properly
DROP FUNCTION IF EXISTS get_session_free_credits(TEXT, UUID);

-- Create the function to get free credits for a specific session
CREATE OR REPLACE FUNCTION get_session_free_credits(
    p_user_wallet_address TEXT,
    p_session_id UUID
)
RETURNS TABLE(free_lines INT, free_nukes INT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE((SELECT amount FROM session_free_line_credits WHERE user_wallet_address = p_user_wallet_address AND session_id = p_session_id), 0) AS free_lines,
        COALESCE((SELECT amount FROM session_free_nuke_credits WHERE user_wallet_address = p_user_wallet_address AND session_id = p_session_id), 0) AS free_nukes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_session_free_credits(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_session_free_credits(TEXT, UUID) TO authenticated;
