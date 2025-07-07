-- This script adds a `signature` column to the transactions table
-- to store the on-chain transaction ID for auditing purposes.

-- Step 1: Add the column if it doesn't already exist.
ALTER TABLE "public"."transactions"
ADD COLUMN IF NOT EXISTS signature TEXT;

-- Step 2: Ensure the signature is unique to prevent duplicate entries.
-- We drop the constraint first in case it exists, making the script runnable multiple times.
ALTER TABLE "public"."transactions"
DROP CONSTRAINT IF EXISTS transactions_signature_key;

ALTER TABLE "public"."transactions"
ADD CONSTRAINT transactions_signature_key UNIQUE (signature);
