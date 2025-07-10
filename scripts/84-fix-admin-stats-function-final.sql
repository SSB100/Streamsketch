-- This script provides the final, correct implementation of the admin dashboard statistics function.
-- It aggregates data across all streamer revenue records to ensure the totals are accurate
-- and uses the new `total_revenue` column for consistency.

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
 RETURNS TABLE(streamer_unclaimed numeric, streamer_claimed numeric, streamer_total numeric, platform_total_earnings numeric, platform_total_withdrawn numeric, platform_available_for_withdrawal numeric, platform_fees_paid numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_streamer_unclaimed NUMERIC;
    v_streamer_claimed NUMERIC;
    v_streamer_total NUMERIC;
BEGIN
    -- Aggregate streamer data from the multi-row revenue table
    SELECT
        COALESCE(SUM(unclaimed_sol), 0),
        COALESCE(SUM(total_claimed), 0),
        COALESCE(SUM(total_revenue), 0)
    INTO
        v_streamer_unclaimed,
        v_streamer_claimed,
        v_streamer_total
    FROM public.revenue;

    -- Join with the single-row platform_revenue table to return all stats
    RETURN QUERY
    SELECT
        v_streamer_unclaimed,
        v_streamer_claimed,
        v_streamer_total,
        pr.platform_revenue AS platform_total_earnings,
        pr.total_withdrawn AS platform_total_withdrawn,
        -- Platform available for withdrawal is the total liquid cash in the wallet,
        -- which is the sum of all streamers' unclaimed SOL.
        v_streamer_unclaimed AS platform_available_for_withdrawal,
        pr.total_fees_paid AS platform_fees_paid
    FROM
        public.platform_revenue pr
    WHERE pr.id = 1;
END;
$function$;
