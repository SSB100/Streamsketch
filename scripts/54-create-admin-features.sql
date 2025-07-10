-- 1. Create a table to store platform-wide revenue and fee data.
-- This ensures we only have one row to manage for the entire platform.
CREATE TABLE IF NOT EXISTS platform_revenue (
    id INT PRIMARY KEY DEFAULT 1,
    total_accumulated_revenue_sol NUMERIC(20, 9) NOT NULL DEFAULT 0,
    total_transaction_fees_paid_sol NUMERIC(20, 9) NOT NULL DEFAULT 0,
    CONSTRAINT single_row_constraint CHECK (id = 1)
);

-- 2. Insert the single row for platform revenue tracking if it doesn't exist.
INSERT INTO platform_revenue (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 3. Update the nuke cleanup function to credit the platform's revenue share.
CREATE OR REPLACE FUNCTION perform_nuke_cleanup(
    p_nuker_wallet_address TEXT,
    p_session_id UUID,
    p_revenue_per_nuke NUMERIC,
    p_streamer_share_rate NUMERIC
)
RETURNS void AS $$
DECLARE
    v_session_owner_wallet TEXT;
    v_streamer_share NUMERIC;
    v_app_share NUMERIC;
BEGIN
    -- Find the session owner
    SELECT owner_wallet_address INTO v_session_owner_wallet
    FROM sessions
    WHERE id = p_session_id;

    -- If session owner is found, calculate and distribute revenue
    IF v_session_owner_wallet IS NOT NULL THEN
        v_streamer_share := p_revenue_per_nuke * p_streamer_share_rate;
        v_app_share := p_revenue_per_nuke * (1 - p_streamer_share_rate);

        -- Add revenue to the streamer's unclaimed balance
        UPDATE revenue
        SET unclaimed_sol = unclaimed_sol + v_streamer_share
        WHERE streamer_wallet_address = v_session_owner_wallet;

        -- NEW: Add revenue to the platform's accumulated balance
        UPDATE platform_revenue
        SET total_accumulated_revenue_sol = total_accumulated_revenue_sol + v_app_share
        WHERE id = 1;
    END IF;

    -- Clear all drawings for the session
    DELETE FROM drawings WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;


-- 4. Update the streamer claim function to log the transaction fee.
CREATE OR REPLACE FUNCTION claim_all_revenue(
    p_streamer_wallet_address TEXT
)
RETURNS NUMERIC AS $$
DECLARE
    v_claim_amount NUMERIC;
    v_tx_fee CONSTANT NUMERIC := 0.000005; -- Define the transaction fee
BEGIN
    -- Use FOR UPDATE to lock the row and prevent race conditions
    SELECT unclaimed_sol INTO v_claim_amount FROM revenue
    WHERE streamer_wallet_address = p_streamer_wallet_address FOR UPDATE;

    IF v_claim_amount IS NULL OR v_claim_amount <= 0 THEN
        RETURN 0;
    END IF;

    -- Reset unclaimed revenue and update total claimed
    UPDATE revenue
    SET unclaimed_sol = 0,
        total_claimed_sol = total_claimed_sol + v_claim_amount
    WHERE streamer_wallet_address = p_streamer_wallet_address;

    -- NEW: Log the transaction fee paid by the platform for this claim
    UPDATE platform_revenue
    SET total_transaction_fees_paid_sol = total_transaction_fees_paid_sol + v_tx_fee
    WHERE id = 1;

    RETURN v_claim_amount;
END;
$$ LANGUAGE plpgsql;


-- 5. Create a new function for the admin to withdraw platform revenue.
CREATE OR REPLACE FUNCTION admin_withdraw_platform_revenue(
    p_withdrawal_percentage NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    v_available_revenue NUMERIC;
    v_withdrawal_amount NUMERIC;
    v_tx_fee CONSTANT NUMERIC := 0.000005; -- Define the transaction fee
BEGIN
    -- Lock the platform revenue row
    SELECT total_accumulated_revenue_sol INTO v_available_revenue
    FROM platform_revenue
    WHERE id = 1 FOR UPDATE;

    IF v_available_revenue IS NULL OR v_available_revenue <= 0 THEN
        RETURN 0;
    END IF;

    -- Calculate the withdrawal amount based on the percentage
    v_withdrawal_amount := v_available_revenue * p_withdrawal_percentage;

    -- Ensure we don't withdraw more than available
    IF v_withdrawal_amount > v_available_revenue THEN
        v_withdrawal_amount := v_available_revenue;
    END IF;

    -- Decrement the platform's revenue and log the transaction fee
    UPDATE platform_revenue
    SET total_accumulated_revenue_sol = total_accumulated_revenue_sol - v_withdrawal_amount,
        total_transaction_fees_paid_sol = total_transaction_fees_paid_sol + v_tx_fee
    WHERE id = 1;

    RETURN v_withdrawal_amount;
END;
$$ LANGUAGE plpgsql;


-- 6. Create a helper function to get total unclaimed streamer revenue for the dashboard.
CREATE OR REPLACE FUNCTION get_total_unclaimed_streamer_revenue()
RETURNS NUMERIC AS $$
DECLARE
    v_total_unclaimed NUMERIC;
BEGIN
    SELECT COALESCE(SUM(unclaimed_sol), 0) INTO v_total_unclaimed
    FROM revenue;

    RETURN v_total_unclaimed;
END;
$$ LANGUAGE plpgsql;
