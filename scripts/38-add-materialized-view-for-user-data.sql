-- Create a materialized view to speed up user data queries
-- This pre-computes the most common user data lookups

-- First, create a function to refresh user stats
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
BEGIN
    RETURN QUERY
    SELECT 
        u.wallet_address,
        u.username,
        (u.line_credits_standard + u.line_credits_discounted) as total_line_credits,
        u.line_credits_standard,
        u.line_credits_discounted,
        COALESCE(r.unclaimed_sol, 0) as unclaimed_sol,
        COALESCE(r.total_claimed_sol, 0) as total_claimed_sol,
        COALESCE(gl.lines_gifted_this_week, 0) as lines_gifted_this_week,
        COALESCE(gl.nukes_gifted_this_week, 0) as nukes_gifted_this_week,
        COALESCE((SELECT SUM(amount) FROM session_free_line_credits WHERE user_wallet_address = p_wallet_address), 0) as total_free_lines,
        COALESCE((SELECT SUM(amount) FROM session_free_nuke_credits WHERE user_wallet_address = p_wallet_address), 0) as total_free_nukes
    FROM users u
    LEFT JOIN revenue r ON u.wallet_address = r.streamer_wallet_address
    LEFT JOIN gifting_limits gl ON u.wallet_address = gl.streamer_wallet_address
        AND gl.week_start_date = (date_trunc('week', (now() AT TIME ZONE 'America/New_York' + interval '1 day')) - interval '1 day')::date
    WHERE u.wallet_address = p_wallet_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION refresh_user_stats(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION refresh_user_stats(TEXT) TO authenticated;
