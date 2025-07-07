-- Refactors the claim revenue function to separate the database update
-- from the transaction logging. The server action will now be responsible
-- for logging the transaction after a successful on-chain payout.

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

    -- Reset unclaimed revenue
    UPDATE revenue SET unclaimed_sol = 0 WHERE streamer_wallet_address = p_streamer_wallet_address;

    -- The function now ONLY returns the amount.
    -- The server-side action is responsible for the on-chain transfer
    -- and logging the transaction with the signature.
    RETURN v_claim_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
