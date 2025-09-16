-- Fix the record_drawing function to use the correct new pricing structure
-- New pricing: 0.01 SOL for 10 lines = 0.001 SOL per line (standard)
-- Large package: 0.03 SOL for 50 lines = 0.0006 SOL per line (discounted)

DROP FUNCTION IF EXISTS record_drawing(TEXT, UUID, JSONB);

CREATE OR REPLACE FUNCTION record_drawing(
    p_drawer_wallet_address TEXT,
    p_session_id UUID,
    p_drawing_data JSONB
)
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
    -- Get session owner
    SELECT owner_wallet_address INTO v_streamer_wallet_address FROM sessions WHERE id = p_session_id;
    IF v_streamer_wallet_address IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    -- Check for free credits first
    SELECT amount INTO v_free_credits
    FROM session_free_line_credits
    WHERE user_wallet_address = p_drawer_wallet_address AND session_id = p_session_id
    FOR UPDATE;

    IF v_free_credits IS NOT NULL AND v_free_credits > 0 THEN
        -- Use free credit - no revenue generated
        UPDATE session_free_line_credits SET amount = amount - 1
        WHERE user_wallet_address = p_drawer_wallet_address AND session_id = p_session_id;

        INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
        VALUES (p_drawer_wallet_address, 'draw_line_free', 0, 'Session ID: ' || p_session_id);
    ELSE
        -- Check paid credits
        SELECT line_credits_standard, line_credits_discounted
        INTO v_paid_credits_standard, v_paid_credits_discounted
        FROM users WHERE wallet_address = p_drawer_wallet_address FOR UPDATE;

        IF v_paid_credits_standard > 0 THEN
            -- Use standard credit - NEW PRICING: 0.001 SOL per line
            UPDATE users SET line_credits_standard = line_credits_standard - 1 WHERE wallet_address = p_drawer_wallet_address;
            v_revenue_per_line := 0.001; -- Updated from 0.002
        ELSIF v_paid_credits_discounted > 0 THEN
            -- Use discounted credit - NEW PRICING: 0.0006 SOL per line (0.03/50)
            UPDATE users SET line_credits_discounted = line_credits_discounted - 1 WHERE wallet_address = p_drawer_wallet_address;
            v_revenue_per_line := 0.0006; -- Updated from 0.0015
        ELSE
            RAISE EXCEPTION 'Insufficient credits';
        END IF;

        -- Calculate streamer share and update revenue
        v_streamer_share := v_revenue_per_line * v_streamer_share_rate;
        
        -- Ensure revenue record exists
        INSERT INTO revenue (streamer_wallet_address, unclaimed_sol, total_claimed_sol)
        VALUES (v_streamer_wallet_address, 0, 0)
        ON CONFLICT (streamer_wallet_address) DO NOTHING;
        
        -- Update revenue
        UPDATE revenue SET unclaimed_sol = unclaimed_sol + v_streamer_share
        WHERE streamer_wallet_address = v_streamer_wallet_address;

        -- Log transaction
        INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
        VALUES (p_drawer_wallet_address, 'draw_line', v_revenue_per_line, 'Session ID: ' || p_session_id);
    END IF;

    -- Insert and return the drawing
    RETURN QUERY
    INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data)
    VALUES (p_session_id, p_drawer_wallet_address, p_drawing_data)
    RETURNING *;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
