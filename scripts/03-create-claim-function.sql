-- Drop the function if it exists, along with any dependent objects.
-- This is crucial because later migrations change the return type, and dropping
-- with CASCADE handles potential dependencies.
DROP FUNCTION IF EXISTS claim_all_revenue(TEXT) CASCADE;

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

    -- Log the claim transaction for auditing
    INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
    VALUES (p_streamer_wallet_address, 'claim_revenue', v_claim_amount, 'User claimed all available revenue.');

    RETURN v_claim_amount;
END;
$$ LANGUAGE plpgsql;
