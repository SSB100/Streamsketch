-- This script deploys the new, smarter functions for managing tiered credits.

-- Function 1: A new function to add specific types of credits.
CREATE OR REPLACE FUNCTION add_line_credits(
    p_wallet_address TEXT,
    p_standard_to_add INT,
    p_discounted_to_add INT
)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET
        line_credits_standard = line_credits_standard + p_standard_to_add,
        line_credits_discounted = line_credits_discounted + p_discounted_to_add
    WHERE wallet_address = p_wallet_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function 2: A completely refactored function for spending credits.
-- It now contains the logic to use the correct credit type and determine revenue.
CREATE OR REPLACE FUNCTION spend_credit_and_draw(
    p_drawer_wallet_address TEXT,
    p_session_id UUID,
    p_drawing_data JSONB
)
RETURNS VOID AS $$
DECLARE
    v_credits_standard INT;
    v_credits_discounted INT;
    v_streamer_wallet_address TEXT;
    v_revenue_per_line NUMERIC;
    v_streamer_share_rate NUMERIC := 0.8; -- 80% share
    v_streamer_share NUMERIC;
BEGIN
    -- 1. Get user's credits and lock the row to prevent race conditions
    SELECT line_credits_standard, line_credits_discounted
    INTO v_credits_standard, v_credits_discounted
    FROM users WHERE wallet_address = p_drawer_wallet_address FOR UPDATE;

    -- 2. Determine which credit to use (standard first) and set its value
    IF v_credits_standard > 0 THEN
        UPDATE users SET line_credits_standard = line_credits_standard - 1 WHERE wallet_address = p_drawer_wallet_address;
        v_revenue_per_line := 0.002; -- Value of a standard line
    ELSIF v_credits_discounted > 0 THEN
        UPDATE users SET line_credits_discounted = line_credits_discounted - 1 WHERE wallet_address = p_drawer_wallet_address;
        v_revenue_per_line := 0.0015; -- Value of a discounted line
    ELSE
        RAISE EXCEPTION 'Insufficient line credits';
    END IF;

    -- 3. Insert the drawing
    INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data)
    VALUES (p_session_id, p_drawer_wallet_address, p_drawing_data);

    -- 4. Calculate and distribute revenue based on the credit's value
    SELECT owner_wallet_address INTO v_streamer_wallet_address FROM sessions WHERE id = p_session_id;
    v_streamer_share := v_revenue_per_line * v_streamer_share_rate;

    UPDATE revenue
    SET unclaimed_sol = unclaimed_sol + v_streamer_share
    WHERE streamer_wallet_address = v_streamer_wallet_address;

    -- 5. Log the transaction for auditing
    INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
    VALUES (p_drawer_wallet_address, 'draw_line', v_revenue_per_line, 'Session ID: ' || p_session_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
