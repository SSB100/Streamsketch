-- Add missing columns to platform_revenue table that the admin stats function expects
ALTER TABLE platform_revenue 
ADD COLUMN IF NOT EXISTS total_withdrawn NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_fees_paid NUMERIC DEFAULT 0;

-- Ensure there's always a row with id=1 for the admin stats to query
INSERT INTO platform_revenue (id, platform_revenue, total_withdrawn, total_fees_paid) 
VALUES (1, 0, 0, 0) 
ON CONFLICT (id) DO NOTHING;
