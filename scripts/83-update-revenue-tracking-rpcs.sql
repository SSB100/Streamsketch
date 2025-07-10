-- This script corrects a critical bug in the revenue tracking functions.
-- Previously, updates to revenue did not specify a streamer, causing incorrect data.
-- This fix ensures revenue from drawing and nuke purchases is credited to the correct streamer
-- and also updates the new `total_revenue` column to maintain data integrity.

-- Fix for the drawing revenue function
CREATE OR REPLACE FUNCTION public.draw_line_segment_batch(p_session_id uuid, p_drawer_wallet_address text, p_segments jsonb[], p_total_cost integer)
 RETURNS TABLE(updated_line_credits integer, updated_nuke_credits integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_owner_wallet_address TEXT;
    v_user_line_credits INT;
    v_user_nuke_credits INT;
    revenue_amount NUMERIC;
    platform_fee NUMERIC;
BEGIN
    -- Get session owner
    SELECT owner_wallet_address INTO v_owner_wallet_address
    FROM public.sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    -- Update user's credits
    UPDATE public.users
    SET line_credits = line_credits - p_total_cost
    WHERE wallet_address = p_drawer_wallet_address
    RETURNING line_credits, nuke_credits INTO v_user_line_credits, v_user_nuke_credits;

    -- Record the drawing data
    INSERT INTO public.drawings (session_id, drawer_wallet_address, drawing_data)
    SELECT p_session_id, p_drawer_wallet_address, value FROM jsonb_array_elements(p_segments::jsonb);

    -- Calculate revenue split (80% to streamer, 20% to platform)
    revenue_amount := p_total_cost * 0.8;
    platform_fee := p_total_cost * 0.2;

    -- Update streamer revenue, now correctly targeting the specific streamer
    UPDATE public.revenue
    SET
        unclaimed_sol = unclaimed_sol + revenue_amount,
        total_revenue = total_revenue + revenue_amount
    WHERE streamer_wallet_address = v_owner_wallet_address;

    -- Update platform revenue
    UPDATE public.platform_revenue
    SET platform_revenue = platform_revenue + platform_fee
    WHERE id = 1;

    -- Record the transaction
    INSERT INTO public.transactions (user_wallet_address, transaction_type, sol_amount, credit_amount, notes)
    VALUES (p_drawer_wallet_address, 'draw_line', 0, p_total_cost, 'Used ' || p_total_cost || ' line credits in session ' || p_session_id);

    RETURN QUERY SELECT v_user_line_credits, v_user_nuke_credits;
END;
$function$;

-- Fix for the nuke purchase revenue function
CREATE OR REPLACE FUNCTION public.purchase_nuke_credits(p_purchaser_wallet_address text, p_session_id uuid, p_nuke_type text, p_sol_amount numeric, p_signature text)
 RETURNS TABLE(updated_line_credits integer, updated_nuke_credits integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_owner_wallet_address TEXT;
    v_user_line_credits INT;
    v_user_nuke_credits INT;
    revenue_amount NUMERIC;
    platform_fee NUMERIC;
BEGIN
    -- Get session owner
    SELECT owner_wallet_address INTO v_owner_wallet_address
    FROM public.sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    -- Update user's nuke credits
    UPDATE public.users
    SET nuke_credits = nuke_credits + 1
    WHERE wallet_address = p_purchaser_wallet_address
    RETURNING line_credits, nuke_credits INTO v_user_line_credits, v_user_nuke_credits;

    -- Calculate revenue split (80% to streamer, 20% to platform)
    revenue_amount := p_sol_amount * 0.8;
    platform_fee := p_sol_amount * 0.2;

    -- Update streamer revenue, now correctly targeting the specific streamer
    UPDATE public.revenue
    SET
        unclaimed_sol = unclaimed_sol + revenue_amount,
        total_revenue = total_revenue + revenue_amount
    WHERE streamer_wallet_address = v_owner_wallet_address;

    -- Update platform revenue
    UPDATE public.platform_revenue
    SET platform_revenue = platform_revenue + platform_fee
    WHERE id = 1;

    -- Record the transaction
    INSERT INTO public.transactions (signature, user_wallet_address, transaction_type, sol_amount, credit_amount, notes)
    VALUES (p_signature, p_purchaser_wallet_address, 'purchase_nuke', p_sol_amount, 1, 'Purchased 1 ' || p_nuke_type || ' nuke credit for session ' || p_session_id);

    RETURN QUERY SELECT v_user_line_credits, v_user_nuke_credits;
END;
$function$;
