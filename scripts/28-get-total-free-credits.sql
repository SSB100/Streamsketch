-- This function calculates the total number of free lines and nukes
-- a user has been gifted, summed up across all streamers.

CREATE OR REPLACE FUNCTION get_total_free_credits(p_user_wallet_address TEXT)
RETURNS TABLE(total_free_lines BIGINT, total_free_nukes BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM free_line_credits WHERE user_wallet_address = p_user_wallet_address) AS total_free_lines,
        (SELECT COALESCE(SUM(amount), 0) FROM free_nuke_credits WHERE user_wallet_address = p_user_wallet_address) AS total_free_nukes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
