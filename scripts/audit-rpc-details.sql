-- Optional: Inspect function definitions for a few critical RPCs (READ-ONLY)
-- If a function isn't found, that row will be empty.
-- Run as needed; comment/uncomment names to inspect.

with targets(name) as (
  values
    ('record_drawing'),
    ('get_leaderboard'),
    ('claim_all_revenue')
)
select t.name,
       pg_get_functiondef(p.oid) as definition
from targets t
left join pg_proc p
  on p.proname = t.name
left join pg_namespace n
  on n.oid = p.pronamespace and n.nspname = 'public';
