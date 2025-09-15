-- Safely sync revenue.total_revenue with (unclaimed_sol + total_claimed_sol)
-- and drop the legacy "total_claimed" column if present.
-- Idempotent and safe to re-run.

BEGIN;

-- 1) Handle legacy column "total_claimed"
DO $$
BEGIN
    -- If total_claimed exists but total_claimed_sol doesn't, rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'revenue' AND column_name = 'total_claimed' 
               AND table_schema = 'public') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'revenue' AND column_name = 'total_claimed_sol' 
                    AND table_schema = 'public') THEN
        ALTER TABLE revenue RENAME COLUMN total_claimed TO total_claimed_sol;
        RAISE NOTICE 'Renamed total_claimed to total_claimed_sol';
    END IF;

    -- If both exist, merge total_claimed into total_claimed_sol and drop total_claimed
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'revenue' AND column_name = 'total_claimed' 
               AND table_schema = 'public') 
    AND EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'revenue' AND column_name = 'total_claimed_sol' 
                AND table_schema = 'public') THEN
        -- Merge values (assuming total_claimed was in lamports, convert to SOL)
        UPDATE revenue 
        SET total_claimed_sol = COALESCE(total_claimed_sol, 0) + COALESCE(total_claimed / 1000000000.0, 0)
        WHERE total_claimed IS NOT NULL AND total_claimed > 0;
        
        -- Drop the legacy column
        ALTER TABLE revenue DROP COLUMN total_claimed;
        RAISE NOTICE 'Merged total_claimed into total_claimed_sol and dropped legacy column';
    END IF;
END $$;

-- 2) Ensure total_revenue column exists
ALTER TABLE revenue 
ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(20, 9) DEFAULT 0;

-- 3) Create or replace trigger function to keep total_revenue in sync
CREATE OR REPLACE FUNCTION sync_total_revenue()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_revenue = COALESCE(NEW.unclaimed_sol, 0) + COALESCE(NEW.total_claimed_sol, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) Ensure trigger exists and fires before insert/update of relevant columns
DROP TRIGGER IF EXISTS sync_total_revenue_trigger ON revenue;
CREATE TRIGGER sync_total_revenue_trigger
    BEFORE INSERT OR UPDATE ON revenue
    FOR EACH ROW
    EXECUTE FUNCTION sync_total_revenue();

-- 5) Backfill total_revenue for existing rows
UPDATE revenue 
SET total_revenue = COALESCE(unclaimed_sol, 0) + COALESCE(total_claimed_sol, 0)
WHERE total_revenue != COALESCE(unclaimed_sol, 0) + COALESCE(total_claimed_sol, 0)
   OR total_revenue IS NULL;

COMMIT;
