-- This script adds the missing columns to the platform_revenue table.
-- These columns are essential for accurately tracking platform withdrawals and associated fees,
-- resolving the error that prevented the admin page from loading.

-- Adds a column to track the total amount of SOL withdrawn by the platform admin.
ALTER TABLE public.platform_revenue
ADD COLUMN IF NOT EXISTS total_withdrawn NUMERIC NOT NULL DEFAULT 0;

-- Adds a column to track the total on-chain transaction fees paid during platform withdrawals.
ALTER TABLE public.platform_revenue
ADD COLUMN IF NOT EXISTS total_fees_paid NUMERIC NOT NULL DEFAULT 0;
