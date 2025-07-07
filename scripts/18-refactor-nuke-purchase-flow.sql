-- This migration removes the nuke credit system in favor of direct purchases.

-- Step 1: Remove the nuke_credits column from the users table.
ALTER TABLE "public"."users"
DROP COLUMN IF EXISTS nuke_credits;

-- Step 2: Remove the function for decrementing nuke credits as it's no longer needed.
DROP FUNCTION IF EXISTS decrement_nuke_credit(text);

-- Step 3: Remove the old nuke purchase transaction type from the transaction history details
-- as it is no longer relevant.
-- This is a retroactive change to clean up the UI.
UPDATE "public"."transactions"
SET transaction_type = 'purchase_nuke_direct'
WHERE transaction_type = 'purchase_nuke';
