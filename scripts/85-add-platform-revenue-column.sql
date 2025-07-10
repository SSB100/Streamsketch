-- ############################################################
-- 85-add-platform-revenue-column.sql
--
-- Adds the missing `platform_revenue` column that all new RPC
-- functions and the admin dashboard expect.
-- ############################################################

BEGIN;

-- 1. Add the column if it does not exist.
ALTER TABLE public.platform_revenue
ADD COLUMN IF NOT EXISTS platform_revenue NUMERIC(20, 9) NOT NULL DEFAULT 0;

-- 2. Back-fill it once so existing data is not lost.
--    If the legacy column `platform_total_earnings` exists,
--    copy its contents into the new column.
DO
$$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'platform_revenue'
      AND column_name = 'platform_total_earnings'
  ) THEN
    EXECUTE 'UPDATE public.platform_revenue
             SET platform_revenue = COALESCE(platform_total_earnings, 0)
             WHERE id = 1';
  END IF;
END;
$$;

COMMIT;
