-- StreamSketch Admin Functions Script
-- This script creates all admin-related functions for the admin dashboard

-- Drop existing admin functions
DROP FUNCTION IF EXISTS get_admin_stats();
DROP FUNCTION IF EXISTS admin_withdraw_platform_revenue(NUMERIC, TEXT);

-- 1. Get admin statistics function
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE(
    total_users BIGINT,
    total_sessions BIGINT,
    total_drawings BIGINT,
    total_transactions BIGINT,
    platform_revenue NUMERIC(20, 9),
    total_withdrawn NUMERIC(20, 9),
    total_fees_paid NUMERIC(20, 9),
    total_user_revenue NUMERIC(20, 9),
    total_unclaimed_revenue NUMERIC(20, 9)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM sessions) as total_sessions,
        (SELECT COUNT(*) FROM drawings) as total_drawings,
        (SELECT COUNT(*) FROM transactions) as total_transactions,
        COALESCE(pr.platform_revenue, 0) as platform_revenue,
        COALESCE(pr.total_withdrawn, 0) as total_withdrawn,
        COALESCE(pr.total_fees_paid, 0) as total_fees_paid,
        COALESCE((SELECT SUM(total_claimed) FROM revenue), 0) as total_user_revenue,
        COALESCE((SELECT SUM(unclaimed_sol) FROM revenue), 0) as total_unclaimed_revenue
    FROM platform_revenue pr
    WHERE pr.id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Admin withdraw platform revenue function
CREATE OR REPLACE FUNCTION admin_withdraw_platform_revenue(
    p_amount NUMERIC(20, 9),
    p_signature TEXT
) RETURNS UUID AS $$
DECLARE
    v_current_revenue NUMERIC(20, 9);
    v_transaction_id UUID;
BEGIN
    -- Check current platform revenue
    SELECT platform_revenue INTO v_current_revenue
    FROM platform_revenue
    WHERE id = 1;
    
    IF v_current_revenue IS NULL OR v_current_revenue < p_amount THEN
        RAISE EXCEPTION 'Insufficient platform revenue to withdraw';
    END IF;
    
    -- Create transaction record
    INSERT INTO transactions (
        user_wallet_address,
        transaction_type,
        sol_amount,
        signature,
        notes
    ) VALUES (
        'PLATFORM_ADMIN',
        'admin_withdraw',
        p_amount,
        p_signature,
        'Platform revenue withdrawal'
    ) RETURNING id INTO v_transaction_id;
    
    -- Update platform revenue
    UPDATE platform_revenue SET
        platform_revenue = platform_revenue - p_amount,
        total_withdrawn = total_withdrawn + p_amount,
        last_updated = NOW()
    WHERE id = 1;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION get_admin_stats() TO service_role;
GRANT EXECUTE ON FUNCTION admin_withdraw_platform_revenue(NUMERIC, TEXT) TO service_role;

COMMIT;
