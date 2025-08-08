-- Backfill per-transaction ledger rows for historical paid line draws.
-- Safe to re-run; guarded by unique index on transaction_id.

-- Parameters
do $$
declare
  v_share_rate numeric := 0.8;
begin
  -- Insert one ledger row for each existing 'draw_line' transaction that doesn't have a ledger entry yet.
  insert into public.session_revenue_ledger (
    session_id, streamer_wallet_address, user_wallet_address,
    revenue_type, source, gross_sol, streamer_share_sol,
    transaction_id, drawing_id, created_at
  )
  select
    s.id as session_id,
    s.owner_wallet_address as streamer_wallet_address,
    t.user_wallet_address,
    'line' as revenue_type,
    'line_legacy' as source,
    t.sol_amount as gross_sol,
    t.sol_amount * v_share_rate as streamer_share_sol,
    t.id as transaction_id,
    null::bigint as drawing_id,
    coalesce(t.created_at, now())
  from public.transactions t
  join public.sessions s
    on s.id::text = substring(coalesce(t.notes,'') from '([0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12})')
  left join public.session_revenue_ledger l
    on l.transaction_id = t.id
  where t.transaction_type = 'draw_line'
    and l.transaction_id is null;
end$$;
