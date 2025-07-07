-- Optimize the user stats function with better indexing and query structure
-- This should significantly speed up the getUserData.optimizedQuery

-- First, let's add a more specific index for the user stats query
CREATE INDEX IF NOT EXISTS users_wallet_all_data_idx 
ON users(wallet_address) 
INCLUDE (username, line_credits_standard, line_credits_discounted);

-- Optimize the refresh_user_stats function for better performance
CREATE OR REPLACE FUNCTION refresh_user_stats(p_wallet_address TEXT)
RETURNS TABLE(
    wallet_address TEXT,
    username TEXT,
    total_line_credits INT,
    line_credits_standard INT,
    line_credits_discounted INT,
    unclaimed_sol NUMERIC,
    total_claimed_sol NUMERIC,
    lines_gifted_this_week INT,
    nukes_gifted_this_week INT,
    total_free_lines BIGINT,
    total_free_nukes BIGINT
) AS $$
DECLARE
    v_current_week_start_est DATE;
BEGIN
    -- Pre-calculate the current week start to avoid repeated calculations
    v_current_week_start_est := (date_trunc('week', (now() AT TIME ZONE 'America/New_York' + interval '1 day')) - interval '1 day')::date;

    RETURN QUERY
    SELECT 
        u.wallet_address,
        u.username,
        (u.line_credits_standard + u.line_credits_discounted) as total_line_credits,
        u.line_credits_standard,
        u.line_credits_discounted,
        COALESCE(r.unclaimed_sol, 0) as unclaimed_sol,
        COALESCE(r.total_claimed_sol, 0) as total_claimed_sol,
        CASE 
            WHEN gl.week_start_date = v_current_week_start_est THEN COALESCE(gl.lines_gifted_this_week, 0)
            ELSE 0
        END as lines_gifted_this_week,
        CASE 
            WHEN gl.week_start_date = v_current_week_start_est THEN COALESCE(gl.nukes_gifted_this_week, 0)
            ELSE 0
        END as nukes_gifted_this_week,
        COALESCE(fl.total_free_lines, 0) as total_free_lines,
        COALESCE(fn.total_free_nukes, 0) as total_free_nukes
    FROM users u
    LEFT JOIN revenue r ON u.wallet_address = r.streamer_wallet_address
    LEFT JOIN gifting_limits gl ON u.wallet_address = gl.streamer_wallet_address
    LEFT JOIN (
        SELECT user_wallet_address, SUM(amount) as total_free_lines
        FROM session_free_line_credits 
        WHERE user_wallet_address = p_wallet_address AND amount > 0
        GROUP BY user_wallet_address
    ) fl ON u.wallet_address = fl.user_wallet_address
    LEFT JOIN (
        SELECT user_wallet_address, SUM(amount) as total_free_nukes
        FROM session_free_nuke_credits 
        WHERE user_wallet_address = p_wallet_address AND amount > 0
        GROUP BY user_wallet_address
    ) fn ON u.wallet_address = fn.user_wallet_address
    WHERE u.wallet_address = p_wallet_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION refresh_user_stats(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION refresh_user_stats(TEXT) TO authenticated;
