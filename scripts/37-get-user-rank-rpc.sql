-- This function gets a specific user's rank on the leaderboard
-- Returns their rank even if they're not in the top 10
CREATE OR REPLACE FUNCTION get_user_rank(p_wallet_address TEXT)
RETURNS TABLE(
    rank BIGINT,
    total_revenue NUMERIC,
    username TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_users AS (
        SELECT 
            u.username,
            r.streamer_wallet_address as wallet_address,
            (COALESCE(r.unclaimed_sol, 0) + COALESCE(r.total_claimed_sol, 0)) as total_revenue,
            ROW_NUMBER() OVER (ORDER BY (COALESCE(r.unclaimed_sol, 0) + COALESCE(r.total_claimed_sol, 0)) DESC) as user_rank
        FROM revenue r
        JOIN users u ON r.streamer_wallet_address = u.wallet_address
        WHERE (COALESCE(r.unclaimed_sol, 0) + COALESCE(r.total_claimed_sol, 0)) > 0
        AND u.username IS NOT NULL
    )
    SELECT 
        ranked_users.user_rank as rank,
        ranked_users.total_revenue,
        ranked_users.username
    FROM ranked_users
    WHERE ranked_users.wallet_address = p_wallet_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_rank(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_user_rank(TEXT) TO authenticated;
