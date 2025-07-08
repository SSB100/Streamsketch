-- This script updates the record_drawing function to return the newly created drawing,
-- which is necessary for broadcasting it in real-time.

DROP FUNCTION IF EXISTS record_drawing(TEXT, UUID, JSONB);

CREATE OR REPLACE FUNCTION record_drawing(
    p_drawer_wallet_address TEXT,
    p_session_id UUID,
    p_drawing_data JSONB
)
-- The function now returns the full drawing record as a table row
RETURNS SETOF drawings AS $$
DECLARE
    v_streamer_wallet_address TEXT;
    v_free_credits INT;
    v_paid_credits_standard INT;
    v_paid_credits_discounted INT;
    v_revenue_per_line NUMERIC;
    v_streamer_share_rate NUMERIC := 0.8; -- 80% share
    v_streamer_share NUMERIC;
BEGIN
    -- This logic remains the same: check for credits and determine revenue.
    SELECT owner_wallet_address INTO v_streamer_wallet_address FROM sessions WHERE id = p_session_id;
    IF v_streamer_wallet_address IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    SELECT amount INTO v_free_credits
    FROM session_free_line_credits
    WHERE user_wallet_address = p_drawer_wallet_address AND session_id = p_session_id
    FOR UPDATE;

    IF v_free_credits IS NOT NULL AND v_free_credits > 0 THEN
        UPDATE session_free_line_credits SET amount = amount - 1
        WHERE user_wallet_address = p_drawer_wallet_address AND session_id = p_session_id;

        INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
        VALUES (p_drawer_wallet_address, 'draw_line_free', 0, 'Session ID: ' || p_session_id);
    ELSE
        SELECT line_credits_standard, line_credits_discounted
        INTO v_paid_credits_standard, v_paid_credits_discounted
        FROM users WHERE wallet_address = p_drawer_wallet_address FOR UPDATE;

        IF v_paid_credits_standard > 0 THEN
            UPDATE users SET line_credits_standard = line_credits_standard - 1 WHERE wallet_address = p_drawer_wallet_address;
            v_revenue_per_line := 0.002;
        ELSIF v_paid_credits_discounted > 0 THEN
            UPDATE users SET line_credits_discounted = line_credits_discounted - 1 WHERE wallet_address = p_drawer_wallet_address;
            v_revenue_per_line := 0.0015;
        ELSE
            RAISE EXCEPTION 'Insufficient credits';
        END IF;

        v_streamer_share := v_revenue_per_line * v_streamer_share_rate;
        UPDATE revenue SET unclaimed_sol = unclaimed_sol + v_streamer_share
        WHERE streamer_wallet_address = v_streamer_wallet_address;

        INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
        VALUES (p_drawer_wallet_address, 'draw_line', v_revenue_per_line, 'Session ID: ' || p_session_id);
    END IF;

    -- Finally, insert the drawing and use RETURNING * to send the new row back.
    RETURN QUERY
    INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data)
    VALUES (p_session_id, p_drawer_wallet_address, p_drawing_data)
    RETURNING *;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
