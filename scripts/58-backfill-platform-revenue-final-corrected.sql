-- This script calculates the total historical revenue from nuke purchases
-- and updates the platform_revenue table.
-- It uses the correct `sol_amount` column from the `transactions` table.

DO $$
DECLARE
    v_total_nuke_revenue_sol NUMERIC;
    v_platform_share_sol NUMERIC;
BEGIN
    -- 1. Calculate the total SOL spent on 'purchase_nuke' transactions.
    -- We use COALESCE to handle the case where there are no nuke purchases yet.
    SELECT COALESCE(SUM(sol_amount), 0)
    INTO v_total_nuke_revenue_sol
    FROM transactions
    WHERE transaction_type = 'purchase_nuke';

    -- 2. Calculate the platform's 20% share of that total revenue.
    v_platform_share_sol := v_total_nuke_revenue_sol * 0.20;

    -- 3. Update the platform_revenue table with the calculated historical share.
    -- This operation is additive, so it's safe to run even if some revenue is already logged.
    -- However, for a clean backfill, it's best to run this once after resetting the value.
    
    -- First, reset the current accumulated revenue to 0 to avoid double-counting.
    UPDATE platform_revenue
    SET total_accumulated_revenue_sol = 0
    WHERE id = 1;

    -- Now, set it to the correctly calculated historical total.
    UPDATE platform_revenue
    SET total_accumulated_revenue_sol = v_platform_share_sol
    WHERE id = 1;

    RAISE NOTICE 'Backfill complete. Platform revenue updated with % SOL.', v_platform_share_sol;
END;
$$ LANGUAGE plpgsql;
