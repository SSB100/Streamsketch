-- This script updates the get_total_free_credits function to work with the new session-specific tables.

-- Drop the old function
DROP FUNCTION IF EXISTS get_total_free_credits(TEXT);

-- Create the new function that sums across all sessions
CREATE OR REPLACE FUNCTION get_total_free_credits(p_user_wallet_address TEXT)
RETURNS TABLE(total_free_lines BIGINT, total_free_nukes BIGINT) AS $$
BEGIN
    -- Ensure the user exists in the system
    IF NOT EXISTS (SELECT 1 FROM users WHERE wallet_address = p_user_wallet_address) THEN
        RETURN QUERY SELECT 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        COALESCE((SELECT SUM(amount) FROM session_free_line_credits WHERE user_wallet_address = p_user_wallet_address), 0)::BIGINT AS total_free_lines,
        COALESCE((SELECT SUM(amount) FROM session_free_nuke_credits WHERE user_wallet_address = p_user_wallet_address), 0)::BIGINT AS total_free_nukes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_total_free_credits(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_total_free_credits(TEXT) TO authenticated;
