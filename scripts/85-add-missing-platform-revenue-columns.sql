-- This script resolves the admin dashboard error by adding the missing
-- columns to the `platform_revenue` table. The `get_admin_dashboard_stats`
-- function requires these columns to exist.

-- Adds a column to track the total amount of SOL withdrawn by the platform admin.
ALTER TABLE public.platform_revenue
ADD COLUMN IF NOT EXISTS total_withdrawn NUMERIC(20, 9) NOT NULL DEFAULT 0;

-- Adds a column to track the total transaction fees paid during withdrawals.
ALTER TABLE public.platform_revenue
ADD COLUMN IF NOT EXISTS total_fees_paid NUMERIC(20, 9) NOT NULL DEFAULT 0;
