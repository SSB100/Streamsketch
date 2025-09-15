-- Verify that total_revenue equals unclaimed_sol + total_claimed_sol for all rows
-- This is a read-only verification script

SELECT 
    streamer_wallet_address,
    unclaimed_sol,
    total_claimed_sol,
    total_revenue,
    (COALESCE(unclaimed_sol, 0) + COALESCE(total_claimed_sol, 0)) AS calculated_total,
    CASE 
        WHEN ABS(total_revenue - (COALESCE(unclaimed_sol, 0) + COALESCE(total_claimed_sol, 0))) > 0.000000001 
        THEN 'MISMATCH' 
        ELSE 'OK' 
    END AS status
FROM revenue
WHERE ABS(total_revenue - (COALESCE(unclaimed_sol, 0) + COALESCE(total_claimed_sol, 0))) > 0.000000001
   OR total_revenue IS NULL
ORDER BY streamer_wallet_address;

-- Summary count
SELECT 
    COUNT(*) as total_revenue_records,
    COUNT(CASE WHEN ABS(total_revenue - (COALESCE(unclaimed_sol, 0) + COALESCE(total_claimed_sol, 0))) > 0.000000001 THEN 1 END) as mismatched_records,
    COUNT(CASE WHEN total_revenue IS NULL THEN 1 END) as null_total_revenue
FROM revenue;
