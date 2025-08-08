-- Read-only audit to find any lingering references to legacy "total_claimed"
-- (excluding "total_claimed_sol"). This script uses NO aggregates of any kind.

-- 1) Tables that still have a physical column named total_claimed
SELECT
  table_schema,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name = 'total_claimed'
ORDER BY table_schema, table_name, column_name;

-- 2) Functions whose source references " total_claimed " but not "total_claimed_sol"
--    (searching all non-system schemas)
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND pg_get_functiondef(p.oid) ILIKE '% total_claimed %'
  AND pg_get_functiondef(p.oid) NOT ILIKE '%total_claimed_sol%'
ORDER BY schema, function_name;

-- 3) Views referencing " total_claimed " but not "total_claimed_sol"
SELECT
  table_schema,
  table_name
FROM information_schema.views
WHERE view_definition ILIKE '% total_claimed %'
  AND view_definition NOT ILIKE '%total_claimed_sol%'
ORDER BY table_schema, table_name;

-- 4) Materialized views referencing " total_claimed " but not "total_claimed_sol"
SELECT
  schemaname AS table_schema,
  matviewname AS table_name
FROM pg_matviews
WHERE definition ILIKE '% total_claimed %'
  AND definition NOT ILIKE '%total_claimed_sol%'
ORDER BY table_schema, table_name;

-- 5) Trigger functions whose source references " total_claimed " but not "total_claimed_sol"
SELECT DISTINCT
  n.nspname AS schema,
  p.proname AS trigger_function,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE NOT t.tgisinternal
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND pg_get_functiondef(p.oid) ILIKE '% total_claimed %'
  AND pg_get_functiondef(p.oid) NOT ILIKE '%total_claimed_sol%'
ORDER BY schema, trigger_function;

-- 6) Constraints whose definition references " total_claimed " but not "total_claimed_sol"
SELECT
  n.nspname AS schema,
  c.relname AS table_name,
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_def
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE con.contype IN ('c', 'f', 'p', 'u', 'x')
  AND pg_get_constraintdef(con.oid) ILIKE '% total_claimed %'
  AND pg_get_constraintdef(con.oid) NOT ILIKE '%total_claimed_sol%'
ORDER BY schema, table_name, constraint_name;

-- 7) Other routines (procedures) outside system schemas that reference the legacy name
SELECT
  routine_schema,
  routine_name
FROM information_schema.routines
WHERE routine_schema NOT IN ('pg_catalog', 'information_schema')
  AND COALESCE(routine_definition, '') ILIKE '% total_claimed %'
  AND COALESCE(routine_definition, '') NOT ILIKE '%total_claimed_sol%'
ORDER BY routine_schema, routine_name;
