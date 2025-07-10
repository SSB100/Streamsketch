-- The previous implementation of get_admin_dashboard_stats used multiple subqueries,
-- which could be inefficient and potentially lead to inconsistent data if run during
-- a transaction. This revised version uses a single query with a cross join
-- (acceptable here as both 'revenue' and 'platform_revenue' tables have only one row)
-- to ensure atomicity and improve readability and performance.

create or replace function get_admin_dashboard_stats()
returns table (
    streamer_unclaimed numeric,
    streamer_claimed numeric,
    streamer_total numeric,
    platform_total_earnings numeric,
    platform_total_withdrawn numeric,
    platform_available_for_withdrawal numeric,
    platform_fees_paid numeric
) as $$
begin
    return query
    select
        r.total_revenue - r.total_claimed as streamer_unclaimed,
        r.total_claimed as streamer_claimed,
        r.total_revenue as streamer_total,
        pr.platform_revenue as platform_total_earnings,
        pr.total_withdrawn as platform_total_withdrawn,
        -- Platform available for withdrawal is the total liquid cash in the wallet,
        -- which is the same as the streamer's unclaimed revenue.
        r.total_revenue - r.total_claimed as platform_available_for_withdrawal,
        pr.total_fees_paid as platform_fees_paid
    from
        revenue r,
        platform_revenue pr;
end;
$$ language plpgsql security definer;
