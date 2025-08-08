-- Creates a per-transaction revenue ledger for sessions.
-- Idempotent and safe to re-run.

create table if not exists public.session_revenue_ledger (
  id                  bigserial primary key,
  session_id          uuid not null references public.sessions(id) on delete cascade,
  streamer_wallet_address text not null,
  user_wallet_address text not null, -- drawer/nuker wallet
  revenue_type        text not null check (revenue_type in ('line','nuke')),
  source              text not null, -- e.g., 'line_standard','line_discounted','line_free','nuke_paid','nuke_free'
  gross_sol           numeric not null default 0,
  streamer_share_sol  numeric not null default 0,
  transaction_id      bigint null references public.transactions(id) on delete set null,
  drawing_id          bigint null references public.drawings(id) on delete set null,
  created_at          timestamptz not null default now()
);

-- Useful indexes
create index if not exists session_revenue_ledger_session_idx on public.session_revenue_ledger(session_id);
create index if not exists session_revenue_ledger_streamer_idx on public.session_revenue_ledger(streamer_wallet_address);
create index if not exists session_revenue_ledger_created_idx on public.session_revenue_ledger(created_at);

-- Ensure we don't double-insert the same transaction during backfills
create unique index if not exists session_revenue_ledger_tx_uidx
  on public.session_revenue_ledger(transaction_id) where transaction_id is not null;
