-- This script creates functions to support the leaderboard system

-- Function to get the top 10 users by total earnings (claimed + unclaimed)
CREATE OR REPLACE FUNCTION get_leaderboard(p_limit INT DEFAULT 10)
RETURNS TABLE(
    rank BIGINT,
    wallet_address TEXT,
    username TEXT,
    total_earnings NUMERIC(20, 9),
    unclaimed_sol NUMERIC(20, 9),
    total_claimed_sol NUMERIC(20, 9)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY (r.unclaimed_sol + r.total_claimed_sol) DESC) as rank,
        u.wallet_address,
        u.username,
        (r.unclaimed_sol + r.total_claimed_sol) as total_earnings,
        r.unclaimed_sol,
        r.total_claimed_sol
    FROM users u
    INNER JOIN revenue r ON u.wallet_address = r.streamer_wallet_address
    WHERE (r.unclaimed_sol + r.total_claimed_sol) > 0
    ORDER BY total_earnings DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get a specific user's rank and earnings
CREATE OR REPLACE FUNCTION get_user_rank(p_wallet_address TEXT)
RETURNS TABLE(
    user_rank BIGINT,
    total_earnings NUMERIC(20, 9),
    total_users_with_earnings BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_users AS (
        SELECT 
            u.wallet_address,
            (r.unclaimed_sol + r.total_claimed_sol) as earnings,
            ROW_NUMBER() OVER (ORDER BY (r.unclaimed_sol + r.total_claimed_sol) DESC) as rank
        FROM users u
        INNER JOIN revenue r ON u.wallet_address = r.streamer_wallet_address
        WHERE (r.unclaimed_sol + r.total_claimed_sol) > 0
    ),
    user_stats AS (
        SELECT 
            COALESCE(ru.rank, 0) as user_rank,
            COALESCE(ru.earnings, 0) as total_earnings,
            (SELECT COUNT(*) FROM ranked_users) as total_users_with_earnings
        FROM ranked_users ru
        WHERE ru.wallet_address = p_wallet_address
        UNION ALL
        SELECT 0, 0, (SELECT COUNT(*) FROM ranked_users)
        WHERE NOT EXISTS (SELECT 1 FROM ranked_users WHERE wallet_address = p_wallet_address)
        LIMIT 1
    )
    SELECT 
        us.user_rank,
        us.total_earnings,
        us.total_users_with_earnings
    FROM user_stats us;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_leaderboard(INT) TO anon;
GRANT EXECUTE ON FUNCTION get_leaderboard(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_rank(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_user_rank(TEXT) TO authenticated;
