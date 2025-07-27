-- Drop the function if it exists, along with any dependent objects.
-- This is necessary to ensure a clean state when running migrations from the beginning,
-- especially if the database schema is from a more recent version.
DROP FUNCTION IF EXISTS spend_credit_and_draw(TEXT, UUID, JSONB) CASCADE;

-- This function ensures all drawing-related operations happen atomically.
CREATE OR REPLACE FUNCTION spend_credit_and_draw(
    p_drawer_wallet_address TEXT,
    p_session_id UUID,
    p_drawing_data JSONB
)
RETURNS VOID AS $$
DECLARE
    v_line_credits INT;
    v_streamer_wallet_address TEXT;
    v_revenue_per_line NUMERIC;
    v_streamer_share NUMERIC;
    v_app_share NUMERIC;
BEGIN
    -- 1. Check and decrement user's line credits
    SELECT line_credits INTO v_line_credits FROM users WHERE wallet_address = p_drawer_wallet_address;

    IF v_line_credits IS NULL OR v_line_credits < 1 THEN
        RAISE EXCEPTION 'Insufficient line credits';
    END IF;

    UPDATE users SET line_credits = line_credits - 1 WHERE wallet_address = p_drawer_wallet_address;

    -- 2. Insert the drawing
    INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data)
    VALUES (p_session_id, p_drawer_wallet_address, p_drawing_data);

    -- 3. Calculate and distribute revenue
    SELECT owner_wallet_address INTO v_streamer_wallet_address FROM sessions WHERE id = p_session_id;

    -- The price of a single line is the pack price divided by the number of lines
    v_revenue_per_line := 0.02 / 10; -- LINE_CREDIT_PRICE_SOL / LINES_PER_PURCHASE
    v_streamer_share := v_revenue_per_line * 0.8; -- STREAMER_REVENUE_SHARE

    UPDATE revenue
    SET unclaimed_sol = unclaimed_sol + v_streamer_share
    WHERE streamer_wallet_address = v_streamer_wallet_address;

    -- 4. Log the transaction for auditing
    INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
    VALUES (p_drawer_wallet_address, 'draw_line', v_revenue_per_line, 'Session ID: ' || p_session_id);

END;
$$ LANGUAGE plpgsql;
