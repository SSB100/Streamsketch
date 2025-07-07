-- This script refactors the nuke functionality into a two-step process
-- to make the user-facing animation feel instantaneous.

-- Drop the old, slow nuke_board function if it exists.
DROP FUNCTION IF EXISTS nuke_board(text, uuid, numeric, numeric);

-- Step 1: A fast function to decrement the user's credit.
-- This is called immediately. It's quick, so the UI isn't blocked.
CREATE OR REPLACE FUNCTION decrement_nuke_credit(
    p_nuker_wallet_address TEXT
)
RETURNS VOID AS $$
DECLARE
    v_nuke_credits INT;
BEGIN
    SELECT nuke_credits INTO v_nuke_credits FROM users WHERE wallet_address = p_nuker_wallet_address FOR UPDATE;

    IF v_nuke_credits IS NULL OR v_nuke_credits < 1 THEN
        RAISE EXCEPTION 'Insufficient nuke credits';
    END IF;

    UPDATE users SET nuke_credits = nuke_credits - 1 WHERE wallet_address = p_nuker_wallet_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Step 2: A slower function to handle the board cleanup and revenue distribution.
-- This is called in the background ("fire-and-forget") after the animation has started.
CREATE OR REPLACE FUNCTION perform_nuke_cleanup(
    p_nuker_wallet_address TEXT,
    p_session_id UUID,
    p_revenue_per_nuke NUMERIC,
    p_streamer_share_rate NUMERIC
)
RETURNS VOID AS $$
DECLARE
    v_streamer_wallet_address TEXT;
    v_streamer_share NUMERIC;
BEGIN
    -- 1. Delete all drawings for the session
    DELETE FROM drawings WHERE session_id = p_session_id;

    -- 2. Calculate and distribute revenue
    SELECT owner_wallet_address INTO v_streamer_wallet_address FROM sessions WHERE id = p_session_id;
    v_streamer_share := p_revenue_per_nuke * p_streamer_share_rate;

    UPDATE revenue
    SET unclaimed_sol = unclaimed_sol + v_streamer_share
    WHERE streamer_wallet_address = v_streamer_wallet_address;

    -- 3. Log the transaction for auditing
    INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
    VALUES (p_nuker_wallet_address, 'nuke_board', p_revenue_per_nuke, 'Session ID: ' || p_session_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
