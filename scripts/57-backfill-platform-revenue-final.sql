-- This script backfills the platform's total accumulated revenue based on all past transactions.
-- It correctly calculates the SOL amount from the stored USD amount (in the 'amount' column) and SOL price.
-- NOTE: This does NOT backfill historical transaction fees for streamer claims, as that data is not available.
-- Fee tracking will be accurate for all claims made after script 54 was implemented.

DO $$
DECLARE
    v_total_transaction_volume_sol NUMERIC;
    v_platform_share_rate CONSTANT NUMERIC := 0.20;
    v_calculated_platform_revenue NUMERIC;
BEGIN
    -- 1. Calculate the total volume in SOL by dividing the USD amount (from the 'amount' column)
    -- by the SOL price at the time of transaction.
    -- We add a check to prevent division by zero or null.
    SELECT COALESCE(SUM(amount / sol_price_usd), 0)
    INTO v_total_transaction_volume_sol
    FROM transactions
    WHERE sol_price_usd IS NOT NULL AND sol_price_usd > 0;

    -- 2. Calculate the platform's 20% share of that total volume.
    v_calculated_platform_revenue := v_total_transaction_volume_sol * v_platform_share_rate;

    -- 3. Update the single row in the platform_revenue table with the calculated historical revenue.
    -- This ensures that all past revenue is accounted for. We do not touch the fees column.
    UPDATE platform_revenue
    SET total_accumulated_revenue_sol = v_calculated_platform_revenue
    WHERE id = 1;

END $$;
