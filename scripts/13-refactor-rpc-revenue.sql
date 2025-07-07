-- This script refactors the core revenue-generating functions to be more secure and maintainable.
-- Instead of hardcoding prices, they are now passed in from the server-side action,
-- making your TypeScript code the single source of truth for pricing.

-- Function to spend a line credit, create a drawing, and distribute revenue.
CREATE OR REPLACE FUNCTION spend_credit_and_draw(
    p_drawer_wallet_address TEXT,
    p_session_id UUID,
    p_drawing_data JSONB,
    p_revenue_per_line NUMERIC, -- New parameter for the line price
    p_streamer_share_rate NUMERIC -- New parameter for the revenue share
)
RETURNS VOID AS $$
DECLARE
    v_line_credits INT;
    v_streamer_wallet_address TEXT;
    v_streamer_share NUMERIC;
BEGIN
    -- 1. Check and decrement user's line credits
    SELECT line_credits INTO v_line_credits FROM users WHERE wallet_address = p_drawer_wallet_address FOR UPDATE;

    IF v_line_credits IS NULL OR v_line_credits < 1 THEN
        RAISE EXCEPTION 'Insufficient line credits';
    END IF;

    UPDATE users SET line_credits = line_credits - 1 WHERE wallet_address = p_drawer_wallet_address;

    -- 2. Insert the drawing
    INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data)
    VALUES (p_session_id, p_drawer_wallet_address, p_drawing_data);

    -- 3. Calculate and distribute revenue using passed-in values
    SELECT owner_wallet_address INTO v_streamer_wallet_address FROM sessions WHERE id = p_session_id;
    v_streamer_share := p_revenue_per_line * p_streamer_share_rate;

    UPDATE revenue
    SET unclaimed_sol = unclaimed_sol + v_streamer_share
    WHERE streamer_wallet_address = v_streamer_wallet_address;

    -- 4. Log the transaction for auditing
    INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
    VALUES (p_drawer_wallet_address, 'draw_line', p_revenue_per_line, 'Session ID: ' || p_session_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to spend a nuke credit, clear a board, and distribute revenue.
CREATE OR REPLACE FUNCTION nuke_board(
    p_nuker_wallet_address TEXT,
    p_session_id UUID,
    p_revenue_per_nuke NUMERIC, -- New parameter for the nuke price
    p_streamer_share_rate NUMERIC -- New parameter for the revenue share
)
RETURNS VOID AS $$
DECLARE
    v_nuke_credits INT;
    v_streamer_wallet_address TEXT;
    v_streamer_share NUMERIC;
BEGIN
    -- 1. Check and decrement user's nuke credits
    SELECT nuke_credits INTO v_nuke_credits FROM users WHERE wallet_address = p_nuker_wallet_address FOR UPDATE;

    IF v_nuke_credits IS NULL OR v_nuke_credits < 1 THEN
        RAISE EXCEPTION 'Insufficient nuke credits';
    END IF;

    UPDATE users SET nuke_credits = nuke_credits - 1 WHERE wallet_address = p_nuker_wallet_address;

    -- 2. Delete all drawings for the session
    DELETE FROM drawings WHERE session_id = p_session_id;

    -- 3. Calculate and distribute revenue using passed-in values
    SELECT owner_wallet_address INTO v_streamer_wallet_address FROM sessions WHERE id = p_session_id;
    v_streamer_share := p_revenue_per_nuke * p_streamer_share_rate;

    UPDATE revenue
    SET unclaimed_sol = unclaimed_sol + v_streamer_share
    WHERE streamer_wallet_address = v_streamer_wallet_address;

    -- 4. Log the transaction for auditing
    INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
    VALUES (p_nuker_wallet_address, 'nuke_board', p_revenue_per_nuke, 'Session ID: ' || p_session_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
