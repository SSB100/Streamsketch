-- This script updates the claim_all_revenue function to correctly
-- track lifetime earnings in the new `total_claimed_sol` column.

CREATE OR REPLACE FUNCTION claim_all_revenue(
    p_streamer_wallet_address TEXT
)
RETURNS NUMERIC AS $$
DECLARE
    v_claim_amount NUMERIC;
BEGIN
    -- Use FOR UPDATE to lock the row and prevent race conditions
    SELECT unclaimed_sol INTO v_claim_amount FROM revenue
    WHERE streamer_wallet_address = p_streamer_wallet_address FOR UPDATE;

    IF v_claim_amount IS NULL OR v_claim_amount <= 0 THEN
        RETURN 0;
    END IF;

    -- Atomically move unclaimed funds to total_claimed and reset unclaimed
    UPDATE revenue
    SET
        total_claimed_sol = total_claimed_sol + v_claim_amount,
        unclaimed_sol = 0
    WHERE streamer_wallet_address = p_streamer_wallet_address;

    -- The function now ONLY returns the amount that was claimed.
    -- The server-side action is responsible for the on-chain transfer
    -- and logging the transaction with the signature.
    RETURN v_claim_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
