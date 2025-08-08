-- Safely drop and recreate leaderboard functions to match your schema:
-- users.wallet_address, revenue.streamer_wallet_address
-- Totals are computed as: total_earnings = COALESCE(unclaimed_sol, 0) + COALESCE(total_claimed_sol, 0)

BEGIN;

-- Drop ALL overloads of public.get_leaderboard(...)
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS ident
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_leaderboard'
  LOOP
    EXECUTE 'DROP FUNCTION ' || rec.ident || ';';
  END LOOP;
END$$;

-- Drop ALL overloads of public.get_user_rank(...)
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS ident
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_user_rank'
  LOOP
    EXECUTE 'DROP FUNCTION ' || rec.ident || ';';
  END LOOP;
END$$;

-- Recreate get_leaderboard(limit int)
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit integer DEFAULT 10)
RETURNS TABLE(
  rank integer,
  wallet_address text,
  username text,
  total_earnings numeric,
  unclaimed_sol numeric,
  total_claimed_sol numeric
)
LANGUAGE sql
STABLE
AS $fn$
  WITH earnings AS (
    SELECT
      r.streamer_wallet_address AS wallet_address,
      COALESCE(r.unclaimed_sol, 0)::numeric AS unclaimed_sol,
      COALESCE(r.total_claimed_sol, 0)::numeric AS total_claimed_sol,
      (COALESCE(r.unclaimed_sol, 0)::numeric + COALESCE(r.total_claimed_sol, 0)::numeric) AS total_earnings
    FROM public.revenue r
  ),
  ranked AS (
    SELECT
      e.*,
      RANK() OVER (ORDER BY e.total_earnings DESC, e.wallet_address) AS rnk
    FROM earnings e
  )
  SELECT
    rnk.rnk::int AS rank,
    rnk.wallet_address,
    u.username,
    rnk.total_earnings,
    rnk.unclaimed_sol,
    rnk.total_claimed_sol
  FROM ranked rnk
  LEFT JOIN public.users u
    ON u.wallet_address = rnk.wallet_address
  ORDER BY rnk.total_earnings DESC NULLS LAST, rnk.wallet_address
  LIMIT p_limit;
$fn$;

-- Recreate get_user_rank(wallet text)
CREATE OR REPLACE FUNCTION public.get_user_rank(p_wallet_address text)
RETURNS TABLE(
  user_rank integer,
  total_earnings numeric,
  total_users_with_earnings integer
)
LANGUAGE sql
STABLE
AS $fn$
  WITH earnings AS (
    SELECT
      r.streamer_wallet_address AS wallet_address,
      (COALESCE(r.unclaimed_sol, 0)::numeric + COALESCE(r.total_claimed_sol, 0)::numeric) AS total_earnings
    FROM public.revenue r
  ),
  ranked AS (
    SELECT
      e.wallet_address,
      e.total_earnings,
      RANK() OVER (ORDER BY e.total_earnings DESC, e.wallet_address) AS rnk
    FROM earnings e
  )
  SELECT
    COALESCE((SELECT rnk FROM ranked WHERE wallet_address = p_wallet_address), 0)::int AS user_rank,
    COALESCE((SELECT total_earnings FROM ranked WHERE wallet_address = p_wallet_address), 0)::numeric AS total_earnings,
    (SELECT COUNT(*) FROM earnings WHERE total_earnings > 0) AS total_users_with_earnings;
$fn$;

-- Grant execution to Supabase roles
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_rank(text) TO anon, authenticated, service_role;

COMMIT;
