CREATE OR REPLACE FUNCTION get_user_free_credit_sessions(p_user_wallet_address TEXT)
RETURNS TABLE(session_id UUID, session_code TEXT, free_lines BIGINT, free_nukes BIGINT, granted_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id AS session_id,
        s.short_code AS session_code,
        COALESCE(l.amount, 0) AS free_lines,
        COALESCE(n.amount, 0) AS free_nukes,
        -- Use the most recent grant time between lines and nukes, handling cases where one might not exist
        GREATEST(COALESCE(l.created_at, '1970-01-01'::timestamptz), COALESCE(n.created_at, '1970-01-01'::timestamptz)) AS granted_at
    FROM
        sessions s
    -- Join on credits for the specific user
    LEFT JOIN
        session_free_line_credits l ON s.id = l.session_id AND l.user_wallet_address = p_user_wallet_address
    LEFT JOIN
        session_free_nuke_credits n ON s.id = n.session_id AND n.user_wallet_address = p_user_wallet_address
    -- Filter to only include sessions where the user has a positive balance of either credit type
    WHERE
        COALESCE(l.amount, 0) > 0 OR COALESCE(n.amount, 0) > 0;
END;
$$ LANGUAGE plpgsql;
