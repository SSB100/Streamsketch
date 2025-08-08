-- Read-only verification. Shows any rows where total_revenue is not equal
-- to (unclaimed_sol + total_claimed_sol). Expect zero rows.

WITH c AS (
  SELECT
    streamer_wallet_address,
    COALESCE(unclaimed_sol, 0)::numeric AS unclaimed_sol,
    COALESCE(total_claimed_sol, 0)::numeric AS total_claimed_sol,
    COALESCE(total_revenue, 0)::numeric AS total_revenue,
    (COALESCE(unclaimed_sol, 0)::numeric + COALESCE(total_claimed_sol, 0)::numeric) AS computed_total
  FROM public.revenue
)
SELECT
  streamer_wallet_address,
  unclaimed_sol,
  total_claimed_sol,
  total_revenue,
  computed_total,
  (total_revenue - computed_total) AS diff
FROM c
WHERE total_revenue IS DISTINCT FROM computed_total
ORDER BY streamer_wallet_address;
