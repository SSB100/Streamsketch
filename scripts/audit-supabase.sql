-- StreamSketch DB Audit (READ-ONLY)
-- Safe to run in Supabase SQL Editor. No changes are made.

-- =========================================================
-- 1) Check core tables exist
-- =========================================================
with checks as (
  select 'users' as tbl, (to_regclass('public.users') is not null) as present
  union all select 'revenue', (to_regclass('public.revenue') is not null)
  union all select 'sessions', (to_regclass('public.sessions') is not null)
  union all select 'drawings', (to_regclass('public.drawings') is not null)
  union all select 'transactions', (to_regclass('public.transactions') is not null)
  union all select 'advertisements', (to_regclass('public.advertisements') is not null)
  union all select 'session_free_line_credits', (to_regclass('public.session_free_line_credits') is not null)
  union all select 'session_free_nuke_credits', (to_regclass('public.session_free_nuke_credits') is not null)
)
select * from checks order by tbl;

-- =========================================================
-- 2) Verify required public functions (RPCs) are present
--    (presence check only, not signature validation)
-- =========================================================
with required(name) as (
  values
    ('add_line_credits'),
    ('record_drawing'),
    ('claim_all_revenue'),
    ('update_transaction_details'),
    ('perform_nuke_cleanup'),
    ('perform_free_nuke_cleanup'),
    ('decrement_session_free_nuke_credit'),
    ('get_session_free_credits'),
    ('get_user_free_credit_sessions'),
    ('get_total_free_credits'),
    ('get_leaderboard'),
    ('get_user_rank'),
    ('get_gifting_limits'),
    ('gift_credits_to_session'),
    ('get_user_dashboard_data')
),
present as (
  select p.proname as name
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
)
select r.name,
       exists (select 1 from present p where p.name = r.name) as present
from required r
order by r.name;

-- =========================================================
-- 3) Advertisements table structure sanity
-- =========================================================
select column_name, data_type, udt_name
from information_schema.columns
where table_schema = 'public' and table_name = 'advertisements'
order by column_name;

-- Optional: peek distinct file_type values seen in data (won't error if table empty)
select distinct file_type
from public.advertisements
order by file_type;

-- =========================================================
-- 4) Sessions short_code uniqueness
-- =========================================================
select
  count(*) as total_sessions,
  count(distinct short_code) as unique_codes,
  (count(*) = count(distinct short_code)) as all_unique
from public.sessions;

-- =========================================================
-- 5) List RLS policies on key tables
-- =========================================================
select pol.polname as policy_name,
       rel.relname as table_name,
       pol.polcmd as command,
       case when pol.polpermissive then 'permissive' else 'restrictive' end as mode
from pg_policy pol
join pg_class rel on rel.oid = pol.polrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname in (
    'sessions','drawings','transactions','advertisements',
    'session_free_line_credits','session_free_nuke_credits','users','revenue'
  )
order by rel.relname, pol.polname;

-- =========================================================
-- 6) Realtime publication membership (tables in supabase_realtime)
-- =========================================================
select p.pubname,
       t.schemaname,
       t.tablename
from pg_publication p
join pg_publication_tables t on t.pubname = p.pubname
where p.pubname = 'supabase_realtime'
  and t.schemaname = 'public'
  and t.tablename in (
    'sessions','drawings','transactions','advertisements'
  )
order by t.tablename;
