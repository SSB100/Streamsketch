-- This script updates the free nuke functions to work with session-specific credits.

-- Step 1: Updated function to decrement session-specific free nuke credits
CREATE OR REPLACE FUNCTION decrement_session_free_nuke_credit(
    p_nuker_wallet_address TEXT,
    p_session_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_free_nuke_credits INT;
BEGIN
    SELECT amount INTO v_free_nuke_credits
    FROM session_free_nuke_credits
    WHERE user_wallet_address = p_nuker_wallet_address
      AND session_id = p_session_id
    FOR UPDATE;

    IF v_free_nuke_credits IS NULL OR v_free_nuke_credits < 1 THEN
        RAISE EXCEPTION 'Insufficient free nuke credits for this session.';
    END IF;

    UPDATE session_free_nuke_credits
    SET amount = amount - 1
    WHERE user_wallet_address = p_nuker_wallet_address
      AND session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old function that was streamer-specific
DROP FUNCTION IF EXISTS decrement_free_nuke_credit(TEXT, TEXT);
