-- This script contains the complete, corrected logic for all admin-related database functions.
-- It ensures accurate statistics, correct withdrawal calculations, and proper transaction recording.

-- We must DROP the function first because we are changing its return signature (adding a new column).
DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats();

-- ========= FIX 1: Correctly calculate and return all admin statistics =========
CREATE FUNCTION public.get_admin_dashboard_stats()
 RETURNS TABLE(streamer_unclaimed numeric, streamer_claimed numeric, streamer_total numeric, platform_total_earnings numeric, platform_total_withdrawn numeric, platform_available_for_withdrawal numeric, platform_fees_paid numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- This function now correctly calculates the platform's liquid assets available for withdrawal.
    RETURN QUERY
    SELECT
        -- Streamer stats are aggregated from the multi-row revenue table
        (SELECT COALESCE(SUM(unclaimed_sol), 0) FROM public.revenue) AS streamer_unclaimed,
        (SELECT COALESCE(SUM(total_claimed), 0) FROM public.revenue) AS streamer_claimed,
        (SELECT COALESCE(SUM(total_revenue), 0) FROM public.revenue) AS streamer_total,
        -- Platform stats come from the single-row platform_revenue table
        pr.platform_revenue AS platform_total_earnings,
        pr.total_withdrawn AS platform_total_withdrawn,
        -- The platform's available funds are its total earnings minus what it has already withdrawn.
        -- This is the actual liquid cash the platform has earned and can access.
        (pr.platform_revenue - pr.total_withdrawn) AS platform_available_for_withdrawal,
        pr.total_fees_paid AS platform_fees_paid
    FROM
        public.platform_revenue pr
    WHERE pr.id = 1;
END;
$function$;


-- ========= FIX 2: Correctly calculate the withdrawal amount based on the 80% rule =========
-- This can be CREATE OR REPLACE because the signature is not changing.
CREATE OR REPLACE FUNCTION public.admin_withdraw_revenue()
RETURNS TABLE(withdrawal_amount numeric, transaction_id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
    v_platform_earnings NUMERIC;
    v_platform_withdrawn NUMERIC;
    v_target_withdraw_amount NUMERIC;
    v_actual_available NUMERIC;
    v_amount_to_withdraw NUMERIC;
    v_transaction_id UUID;
BEGIN
    -- Get current platform revenue state
    SELECT platform_revenue, total_withdrawn
    INTO v_platform_earnings, v_platform_withdrawn
    FROM public.platform_revenue
    WHERE id = 1;

    -- Calculate the amount needed to bring total withdrawn up to 80% of total earnings
    v_target_withdraw_amount := (v_platform_earnings * 0.8) - v_platform_withdrawn;

    -- Calculate the actual liquid cash the platform has earned
    v_actual_available := v_platform_earnings - v_platform_withdrawn;

    -- The amount to withdraw is the lesser of the target and what's available. Must be positive.
    v_amount_to_withdraw := GREATEST(0, LEAST(v_target_withdraw_amount, v_actual_available));
    v_amount_to_withdraw := TRUNC(v_amount_to_withdraw, 9); -- Avoid SOL dust issues

    IF v_amount_to_withdraw > 0 THEN
        -- Create a transaction record for this withdrawal attempt.
        INSERT INTO public.transactions (user_wallet_address, transaction_type, sol_amount, notes)
        VALUES ('platform_admin', 'platform_withdrawal', v_amount_to_withdraw, 'Platform earnings withdrawal.')
        RETURNING id INTO v_transaction_id;

        RETURN QUERY SELECT v_amount_to_withdraw, v_transaction_id;
    ELSE
        -- If there's nothing to withdraw, return 0 and a null transaction ID.
        RETURN QUERY SELECT 0::NUMERIC, NULL::UUID;
    END IF;
END;
$$;


-- ========= FIX 3: Correctly update platform totals after a successful withdrawal =========
-- This can be CREATE OR REPLACE because the signature is not changing.
CREATE OR REPLACE FUNCTION public.update_transaction_details(p_transaction_id uuid, p_signature text, p_fee numeric)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_transaction_type TEXT;
    v_sol_amount NUMERIC;
BEGIN
    -- Get the transaction details
    SELECT transaction_type, sol_amount
    INTO v_transaction_type, v_sol_amount
    FROM public.transactions
    WHERE id = p_transaction_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
    END IF;

    -- Update the transaction record itself
    UPDATE public.transactions
    SET
        signature = p_signature,
        fee = p_fee
    WHERE id = p_transaction_id;

    -- If it's a platform withdrawal, update the platform_revenue table with the withdrawn amount and fee
    IF v_transaction_type = 'platform_withdrawal' THEN
        UPDATE public.platform_revenue
        SET
            total_withdrawn = total_withdrawn + v_sol_amount,
            total_fees_paid = total_fees_paid + p_fee
        WHERE id = 1;
    END IF;
END;
$$;
