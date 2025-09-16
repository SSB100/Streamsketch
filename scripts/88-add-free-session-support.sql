-- Add is_free column to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for better performance when filtering free sessions
CREATE INDEX IF NOT EXISTS sessions_is_free_idx ON sessions(is_free);

-- Update the record_drawing function to handle free sessions
CREATE OR REPLACE FUNCTION record_drawing(
    p_drawer_wallet_address TEXT,
    p_session_id UUID,
    p_drawing_data JSONB
)
RETURNS SETOF drawings AS $$
DECLARE
    v_streamer_wallet_address TEXT;
    v_is_free_session BOOLEAN;
    v_free_credits INT;
    v_paid_credits_standard INT;
    v_paid_credits_discounted INT;
    v_revenue_per_line NUMERIC;
    v_streamer_share_rate NUMERIC := 0.8; -- 80% share
    v_streamer_share NUMERIC;
BEGIN
    -- Get session info including if it's free
    SELECT owner_wallet_address, is_free INTO v_streamer_wallet_address, v_is_free_session 
    FROM sessions WHERE id = p_session_id;
    
    IF v_streamer_wallet_address IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    -- If session is free, skip all credit checks and revenue calculations
    IF v_is_free_session THEN
        INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
        VALUES (p_drawer_wallet_address, 'draw_line_free_session', 0, 'Free session ID: ' || p_session_id);
    ELSE
        -- Existing paid session logic
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
    END IF;

    -- Insert the drawing and return it
    RETURN QUERY
    INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data)
    VALUES (p_session_id, p_drawer_wallet_address, p_drawing_data)
    RETURNING *;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to toggle session free status
CREATE OR REPLACE FUNCTION toggle_session_free_status(
    p_session_id UUID,
    p_owner_wallet_address TEXT,
    p_is_free BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
    v_owner_wallet TEXT;
BEGIN
    -- Verify ownership
    SELECT owner_wallet_address INTO v_owner_wallet
    FROM sessions WHERE id = p_session_id;
    
    IF v_owner_wallet IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;
    
    IF v_owner_wallet != p_owner_wallet_address THEN
        RAISE EXCEPTION 'Not authorized to modify this session';
    END IF;
    
    -- Update the session
    UPDATE sessions SET is_free = p_is_free WHERE id = p_session_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
