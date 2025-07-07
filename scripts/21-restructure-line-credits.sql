-- This migration refactors the user credits system to support multiple credit tiers.

-- Step 1: Add the new, specific credit columns.
ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS line_credits_standard INT NOT NULL DEFAULT 0;

ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS line_credits_discounted INT NOT NULL DEFAULT 0;

-- Step 2: Migrate existing credits from the old column to the new 'standard' column.
-- This ensures no users lose their existing credits.
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='line_credits') THEN
        UPDATE "public"."users"
        SET line_credits_standard = line_credits_standard + line_credits
        WHERE line_credits > 0;
    END IF;
END $$;


-- Step 3: Drop the old, obsolete 'line_credits' column.
ALTER TABLE "public"."users"
DROP COLUMN IF EXISTS line_credits;
