-- Drop the function with the incorrect signature that was causing errors.
-- We specify the argument types to uniquely identify the function to drop.
DROP FUNCTION IF EXISTS get_user_free_credit_sessions(TEXT);

-- Recreate the function as it was in the last stable version.
-- This version returns the correct data structure that the dashboard expects.
CREATE OR REPLACE FUNCTION get_user_free_credit_sessions(p_user_wallet_address TEXT)
RETURNS TABLE(session_id UUID, session_code TEXT, free_lines BIGINT, free_nukes BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id AS session_id,
        s.short_code AS session_code,
        COALESCE(l.amount, 0) AS free_lines,
        COALESCE(n.amount, 0) AS free_nukes
    FROM
        sessions s
    LEFT JOIN
        session_free_line_credits l ON s.id = l.session_id AND l.user_wallet_address = p_user_wallet_address
    LEFT JOIN
        session_free_nuke_credits n ON s.id = n.session_id AND n.user_wallet_address = p_user_wallet_address
    WHERE
        -- Only return sessions where the user actually has free credits
        COALESCE(l.amount, 0) > 0 OR COALESCE(n.amount, 0) > 0;
END;
$$ LANGUAGE plpgsql;
