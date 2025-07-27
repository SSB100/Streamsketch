-- Drop the function if it exists to allow for re-creation with a different signature.
DROP FUNCTION IF EXISTS nuke_board(TEXT, UUID);

CREATE OR REPLACE FUNCTION nuke_board(
    p_nuker_wallet_address TEXT,
    p_session_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_nuke_credits INT;
    v_streamer_wallet_address TEXT;
    v_revenue_per_nuke NUMERIC;
    v_streamer_share NUMERIC;
BEGIN
    -- 1. Check and decrement user's nuke credits
    SELECT nuke_credits INTO v_nuke_credits FROM users WHERE wallet_address = p_nuker_wallet_address FOR UPDATE;

    IF v_nuke_credits IS NULL OR v_nuke_credits < 1 THEN
        RAISE EXCEPTION 'Insufficient nuke credits';
    END IF;

    UPDATE users SET nuke_credits = nuke_credits - 1 WHERE wallet_address = p_nuker_wallet_address;

    -- 2. Delete all drawings for the session
    DELETE FROM drawings WHERE session_id = p_session_id;

    -- 3. Calculate and distribute revenue
    SELECT owner_wallet_address INTO v_streamer_wallet_address FROM sessions WHERE id = p_session_id;

    v_revenue_per_nuke := 0.03; -- NUKE_CREDIT_PRICE_SOL
    v_streamer_share := v_revenue_per_nuke * 0.8; -- STREAMER_REVENUE_SHARE

    UPDATE revenue
    SET unclaimed_sol = unclaimed_sol + v_streamer_share
    WHERE streamer_wallet_address = v_streamer_wallet_address;

    -- 4. Log the transaction for auditing
    INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
    VALUES (p_nuker_wallet_address, 'nuke_board', v_revenue_per_nuke, 'Session ID: ' || p_session_id);

END;
$$ LANGUAGE plpgsql;
