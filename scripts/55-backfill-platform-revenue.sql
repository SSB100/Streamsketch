-- This script backfills the platform's total accumulated revenue based on all past transactions.
-- It calculates 20% of the total SOL value from all nuke purchases.
-- NOTE: This does NOT backfill historical transaction fees for streamer claims, as that data is not available.
-- Fee tracking will be accurate for all claims made after script 54 was implemented.

DO $$
DECLARE
    v_total_transaction_volume NUMERIC;
    v_platform_share_rate CONSTANT NUMERIC := 0.20;
    v_calculated_platform_revenue NUMERIC;
BEGIN
    -- 1. Calculate the total volume of all transactions ever made.
    SELECT COALESCE(SUM(amount_sol), 0)
    INTO v_total_transaction_volume
    FROM transactions;

    -- 2. Calculate the platform's 20% share of that total volume.
    v_calculated_platform_revenue := v_total_transaction_volume * v_platform_share_rate;

    -- 3. Update the single row in the platform_revenue table with the calculated historical revenue.
    -- This ensures that all past revenue is accounted for. We do not touch the fees column.
    UPDATE platform_revenue
    SET total_accumulated_revenue_sol = v_calculated_platform_revenue
    WHERE id = 1;

END $$;
