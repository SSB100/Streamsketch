-- Safely sync revenue.total_revenue with (unclaimed_sol + total_claimed_sol)
-- and drop the legacy "total_claimed" column if present.
-- Idempotent and safe to re-run.

BEGIN;

-- 1) Handle legacy column "total_claimed"
DO $$
DECLARE
  has_total_claimed boolean;
  has_total_claimed_sol boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'revenue' AND column_name = 'total_claimed'
  ) INTO has_total_claimed;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'revenue' AND column_name = 'total_claimed_sol'
  ) INTO has_total_claimed_sol;

  IF has_total_claimed AND has_total_claimed_sol THEN
    -- Merge legacy values into total_claimed_sol, then drop legacy column
    EXECUTE 'UPDATE public.revenue SET total_claimed_sol = COALESCE(total_claimed_sol,0) + COALESCE(total_claimed,0)';
    EXECUTE 'ALTER TABLE public.revenue DROP COLUMN IF EXISTS total_claimed';
  ELSIF has_total_claimed AND NOT has_total_claimed_sol THEN
    -- Rename legacy column to the canonical name
    EXECUTE 'ALTER TABLE public.revenue RENAME COLUMN total_claimed TO total_claimed_sol';
  END IF;
END
$$;

-- 2) Ensure total_revenue column exists
DO $$
DECLARE
  has_total_revenue boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'revenue' AND column_name = 'total_revenue'
  ) INTO has_total_revenue;

  IF NOT has_total_revenue THEN
    EXECUTE 'ALTER TABLE public.revenue ADD COLUMN total_revenue numeric';
  END IF;
END
$$;

-- 3) Create or replace trigger function to keep total_revenue in sync
CREATE OR REPLACE FUNCTION public.revenue_total_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  NEW.total_revenue := COALESCE(NEW.unclaimed_sol, 0)::numeric + COALESCE(NEW.total_claimed_sol, 0)::numeric;
  RETURN NEW;
END;
$fn$;

-- 4) Ensure trigger exists and fires before insert/update of relevant columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_revenue_total_sync'
      AND tgrelid = 'public.revenue'::regclass
  ) THEN
    -- Drop and recreate to ensure correct definition
    EXECUTE 'DROP TRIGGER trg_revenue_total_sync ON public.revenue';
  END IF;

  EXECUTE '
    CREATE TRIGGER trg_revenue_total_sync
    BEFORE INSERT OR UPDATE OF unclaimed_sol, total_claimed_sol
    ON public.revenue
    FOR EACH ROW
    EXECUTE FUNCTION public.revenue_total_sync()
  ';
END
$$;

-- 5) Backfill total_revenue for existing rows
UPDATE public.revenue
SET total_revenue = COALESCE(unclaimed_sol, 0)::numeric + COALESCE(total_claimed_sol, 0)::numeric;

COMMIT;
