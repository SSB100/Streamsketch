-- Recreate leaderboard functions to ensure consistent logic after pricing changes.
-- Uses revenue as the single source of truth (unclaimed + total_claimed).
-- This preserves historical totals and reflects new credits added going forward.

create or replace function public.get_leaderboard(p_limit integer default 10)
returns table(
  rank bigint,
  wallet_address text,
  username text,
  total_earnings numeric,
  unclaimed_sol numeric,
  total_claimed_sol numeric
)
language plpgsql
as $$
begin
  return query
  select
    row_number() over (order by (coalesce(r.unclaimed_sol, 0) + coalesce(r.total_claimed_sol, 0)) desc) as rank,
    u.wallet_address,
    u.username,
    (coalesce(r.unclaimed_sol, 0) + coalesce(r.total_claimed_sol, 0)) as total_earnings,
    coalesce(r.unclaimed_sol, 0) as unclaimed_sol,
    coalesce(r.total_claimed_sol, 0) as total_claimed_sol
  from public.users u
  join public.revenue r on r.streamer_wallet_address = u.wallet_address
  where (coalesce(r.unclaimed_sol, 0) + coalesce(r.total_claimed_sol, 0)) > 0
  order by total_earnings desc
  limit p_limit;
end;
$$;

create or replace function public.get_user_rank(p_wallet_address text)
returns table(
  user_rank bigint,
  total_earnings numeric,
  total_users_with_earnings bigint
)
language plpgsql
as $$
begin
  return query
  with ranked_users as (
    select
      u.wallet_address,
      (coalesce(r.unclaimed_sol, 0) + coalesce(r.total_claimed_sol, 0)) as earnings,
      row_number() over (order by (coalesce(r.unclaimed_sol, 0) + coalesce(r.total_claimed_sol, 0)) desc) as rank
    from public.users u
    join public.revenue r on r.streamer_wallet_address = u.wallet_address
    where (coalesce(r.unclaimed_sol, 0) + coalesce(r.total_claimed_sol, 0)) > 0
  ),
  total_count as (
    select count(*) as total from ranked_users
  )
  select
    coalesce(ru.rank, 0)::bigint,
    coalesce(ru.earnings, 0)::numeric,
    tc.total::bigint
  from total_count tc
  left join ranked_users ru on ru.wallet_address = p_wallet_address;
end;
$$;

grant execute on function public.get_leaderboard(integer) to anon, authenticated;
grant execute on function public.get_user_rank(text) to anon, authenticated;
