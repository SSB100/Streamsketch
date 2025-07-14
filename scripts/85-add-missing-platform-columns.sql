-- This script ensures the platform_revenue table has the necessary columns
-- (total_withdrawn, total_fees_paid) and an initial row for tracking.

-- Add total_withdrawn column if it doesn't exist
ALTER TABLE public.platform_revenue
ADD COLUMN IF NOT EXISTS total_withdrawn NUMERIC(20, 9) NOT NULL DEFAULT 0;

-- Add total_fees_paid column if it doesn't exist
ALTER TABLE public.platform_revenue
ADD COLUMN IF NOT EXISTS total_fees_paid NUMERIC(20, 9) NOT NULL DEFAULT 0;

-- Ensure there is a row with id = 1 for platform revenue tracking
-- This is crucial as other functions update WHERE id = 1
INSERT INTO public.platform_revenue (id, platform_revenue, total_withdrawn, total_fees_paid)
VALUES (1, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;
