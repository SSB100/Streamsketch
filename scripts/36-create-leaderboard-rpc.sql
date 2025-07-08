-- This function gets the top streamers by total revenue (claimed + unclaimed)
-- It only includes users who have earned revenue and have set a username
CREATE OR REPLACE FUNCTION get_revenue_leaderboard(p_limit INT DEFAULT 10)
RETURNS TABLE(
    username TEXT,
    wallet_address TEXT,
    total_revenue NUMERIC,
    unclaimed_sol NUMERIC,
    total_claimed_sol NUMERIC,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.username,
        r.streamer_wallet_address as wallet_address,
        (COALESCE(r.unclaimed_sol, 0) + COALESCE(r.total_claimed_sol, 0)) as total_revenue,
        COALESCE(r.unclaimed_sol, 0) as unclaimed_sol,
        COALESCE(r.total_claimed_sol, 0) as total_claimed_sol,
        ROW_NUMBER() OVER (ORDER BY (COALESCE(r.unclaimed_sol, 0) + COALESCE(r.total_claimed_sol, 0)) DESC) as rank
    FROM revenue r
    JOIN users u ON r.streamer_wallet_address = u.wallet_address
    WHERE (COALESCE(r.unclaimed_sol, 0) + COALESCE(r.total_claimed_sol, 0)) > 0
    AND u.username IS NOT NULL
    ORDER BY total_revenue DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_revenue_leaderboard(INT) TO anon;
GRANT EXECUTE ON FUNCTION get_revenue_leaderboard(INT) TO authenticated;
