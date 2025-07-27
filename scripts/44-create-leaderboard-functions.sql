-- This script corrects and replaces the leaderboard functions to fix schema mismatches.

-- Forcefully drop the old functions and any dependent objects to ensure a clean update.
-- This is necessary to resolve issues where the function signature might have changed.
DROP FUNCTION IF EXISTS get_leaderboard(integer);
DROP FUNCTION IF EXISTS get_user_rank(text);

-- Recreate the function to get the top N streamers for the leaderboard.
-- This version uses the correct 'total_claimed_sol' column name.
CREATE OR REPLACE FUNCTION get_leaderboard(p_limit integer DEFAULT 10)
RETURNS TABLE(
    rank bigint,
    wallet_address text,
    username text,
    total_earnings numeric,
    unclaimed_sol numeric,
    total_claimed_sol numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY (COALESCE(r.unclaimed_sol, 0) + COALESCE(r.total_claimed_sol, 0)) DESC) as rank,
        u.wallet_address,
        u.username,
        (COALESCE(r.unclaimed_sol, 0) + COALESCE(r.total_claimed_sol, 0)) as total_earnings,
        r.unclaimed_sol,
        r.total_claimed_sol
    FROM
        users u
    JOIN
        revenue r ON u.wallet_address = r.streamer_wallet_address
    WHERE
        (COALESCE(r.unclaimed_sol, 0) + COALESCE(r.total_claimed_sol, 0)) > 0
    ORDER BY
        total_earnings DESC
    LIMIT p_limit;
END;
$$;

-- Recreate the function to get a specific user's rank and earnings.
-- This version also uses the correct 'total_claimed_sol' column name.
CREATE OR REPLACE FUNCTION get_user_rank(p_wallet_address text)
RETURNS TABLE(
    user_rank bigint,
    total_earnings numeric,
    total_users_with_earnings bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH ranked_users AS (
        SELECT
            u.wallet_address,
            (COALESCE(r.unclaimed_sol, 0) + COALESCE(r.total_claimed_sol, 0)) as earnings,
            ROW_NUMBER() OVER (ORDER BY (COALESCE(r.unclaimed_sol, 0) + COALESCE(r.total_claimed_sol, 0)) DESC) as rank
        FROM
            users u
        JOIN
            revenue r ON u.wallet_address = r.streamer_wallet_address
        WHERE
            (COALESCE(r.unclaimed_sol, 0) + COALESCE(r.total_claimed_sol, 0)) > 0
    ),
    total_count AS (
        SELECT count(*) as total FROM ranked_users
    )
    SELECT
        COALESCE(ru.rank, 0)::bigint,
        COALESCE(ru.earnings, 0)::numeric,
        tc.total::bigint
    FROM
        total_count tc
    LEFT JOIN
        ranked_users ru ON ru.wallet_address = p_wallet_address;
END;
$$;

-- Grant execute permissions for the new functions
GRANT EXECUTE ON FUNCTION get_leaderboard(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_rank(text) TO anon, authenticated;
