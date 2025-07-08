-- Drop the existing function
DROP FUNCTION IF EXISTS get_user_free_credit_sessions(p_user_wallet_address TEXT);

-- Create the function
CREATE OR REPLACE FUNCTION get_user_free_credit_sessions(p_user_wallet_address TEXT)
RETURNS TABLE (
    session_id UUID,
    session_code TEXT,
    free_lines INTEGER,
    free_nukes INTEGER,
    granted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sflc.session_id,
        s.short_code AS session_code,
        SUM(sflc.amount) AS free_lines,
        SUM(sfn.amount) AS free_nukes,
        MIN(sflc.granted_at) AS granted_at  -- Explicitly use sflc.granted_at
    FROM
        sessions s
    LEFT JOIN
        session_free_line_credits sflc ON s.id = sflc.session_id AND sflc.user_wallet_address = p_user_wallet_address
    LEFT JOIN
        session_free_nuke_credits sfn ON s.id = sfn.session_id AND sfn.user_wallet_address = p_user_wallet_address
    WHERE
        sflc.user_wallet_address = p_user_wallet_address OR sfn.user_wallet_address = p_user_wallet_address
    GROUP BY
        sflc.session_id, s.short_code;
END;
$$ LANGUAGE plpgsql;
