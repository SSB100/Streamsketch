-- This script adds functions to handle spending free nuke credits.
-- It follows the same two-step pattern as paid nukes for a responsive UI.

-- Step 1: A fast function to decrement the user's free nuke credit.
CREATE OR REPLACE FUNCTION decrement_free_nuke_credit(
    p_nuker_wallet_address TEXT,
    p_session_owner_wallet_address TEXT
)
RETURNS VOID AS $$
DECLARE
    v_free_nuke_credits INT;
BEGIN
    SELECT amount INTO v_free_nuke_credits
    FROM free_nuke_credits
    WHERE user_wallet_address = p_nuker_wallet_address
      AND session_owner_wallet_address = p_session_owner_wallet_address
    FOR UPDATE;

    IF v_free_nuke_credits IS NULL OR v_free_nuke_credits < 1 THEN
        RAISE EXCEPTION 'Insufficient free nuke credits for this streamer.';
    END IF;

    UPDATE free_nuke_credits
    SET amount = amount - 1
    WHERE user_wallet_address = p_nuker_wallet_address
      AND session_owner_wallet_address = p_session_owner_wallet_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Step 2: A background function to clean up the board.
-- This does NOT distribute revenue.
CREATE OR REPLACE FUNCTION perform_free_nuke_cleanup(
    p_nuker_wallet_address TEXT,
    p_session_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- 1. Delete all drawings for the session
    DELETE FROM drawings WHERE session_id = p_session_id;

    -- 2. Log the transaction for auditing (0 SOL value)
    INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
    VALUES (p_nuker_wallet_address, 'nuke_board_free', 0, 'Session ID: ' || p_session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
