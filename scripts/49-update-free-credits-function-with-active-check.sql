-- Drop the function if it exists to ensure a clean update.
DROP FUNCTION IF EXISTS get_user_free_credit_sessions(TEXT);

-- Recreate the function with the added check for active sessions.
CREATE OR REPLACE FUNCTION get_user_free_credit_sessions(p_user_wallet_address TEXT)
-- Defines the structure of the table that the function will return.
RETURNS TABLE(session_id UUID, session_code TEXT, free_lines BIGINT, free_nukes BIGINT, granted_at TIMESTAMPTZ) AS $$
BEGIN
    -- This query will be returned by the function.
    RETURN QUERY
    SELECT
        s.id AS session_id,
        s.short_code AS session_code,
        -- Use COALESCE to return 0 instead of NULL if no record is found.
        COALESCE(l.amount, 0) AS free_lines,
        COALESCE(n.amount, 0) AS free_nukes,
        -- Get the most recent grant time between lines and nukes.
        GREATEST(COALESCE(l.created_at, '1970-01-01'::timestamptz), COALESCE(n.created_at, '1970-01-01'::timestamptz)) AS granted_at
    FROM
        sessions s
    -- Use LEFT JOIN to include all sessions, even if they only have one type of credit.
    LEFT JOIN
        session_free_line_credits l ON s.id = l.session_id AND l.user_wallet_address = p_user_wallet_address
    LEFT JOIN
        session_free_nuke_credits n ON s.id = n.session_id AND n.user_wallet_address = p_user_wallet_address
    -- The crucial WHERE clause: only return rows where the session is active AND the user has credits.
    WHERE
        s.is_active = true AND (COALESCE(l.amount, 0) > 0 OR COALESCE(n.amount, 0) > 0);
END;
$$ LANGUAGE plpgsql;
