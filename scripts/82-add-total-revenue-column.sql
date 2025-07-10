-- Adds the total_revenue column to the revenue table to track all-time earnings for streamers.
-- This simplifies reporting, avoids repeated calculations, and makes the schema more robust.
ALTER TABLE public.revenue
ADD COLUMN IF NOT EXISTS total_revenue NUMERIC(20, 9) NOT NULL DEFAULT 0;

-- This one-time operation backfills the new total_revenue column for all existing streamer records.
-- Total revenue is the sum of what's currently in their unclaimed balance plus what they have already claimed.
UPDATE public.revenue
SET total_revenue = unclaimed_sol + total_claimed;
