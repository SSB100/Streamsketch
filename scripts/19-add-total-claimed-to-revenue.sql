-- This migration adds a new column to the revenue table to track
-- the total amount of SOL a user has ever claimed.

ALTER TABLE "public"."revenue"
ADD COLUMN IF NOT EXISTS total_claimed_sol NUMERIC(20, 9) NOT NULL DEFAULT 0;
