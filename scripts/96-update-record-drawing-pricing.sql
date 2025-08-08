-- Update record_drawing to use new per-line pricing effective immediately.
-- Previous rates:
--   standard:   0.002  SOL/line
--   discounted: 0.0015 SOL/line
-- New rates:
--   standard (10-pack @ 0.01 SOL):      0.001  SOL/line
--   discounted (50-pack @ 0.04 SOL):    0.0008 SOL/line
--
-- Notes:
-- - Free session credits still consume first and generate no revenue.
-- - Streamer share remains 80% (v_streamer_share_rate = 0.8).
-- - This is forward-only for future drawings; past transactions remain intact.

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
  v_streamer_share_rate NUMERIC := 0.8; -- 80% share to streamer
  v_streamer_share NUMERIC;
BEGIN
  -- Validate session and get the owner (streamer)
  SELECT owner_wallet_address
    INTO v_streamer_wallet_address
  FROM sessions
  WHERE id = p_session_id;

  IF v_streamer_wallet_address IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- 1) Consume free session credits first (no revenue)
  SELECT amount
    INTO v_free_credits
  FROM session_free_line_credits
  WHERE user_wallet_address = p_drawer_wallet_address
    AND session_id = p_session_id
  FOR UPDATE;

  IF v_free_credits IS NOT NULL AND v_free_credits > 0 THEN
    UPDATE session_free_line_credits
      SET amount = amount - 1
    WHERE user_wallet_address = p_drawer_wallet_address
      AND session_id = p_session_id;

    INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
    VALUES (p_drawer_wallet_address, 'draw_line_free', 0, 'Session ID: ' || p_session_id);

  ELSE
    -- 2) Otherwise consume paid credits from the user:
    --    Prefer standard first, then discounted (existing behavior).
    SELECT line_credits_standard, line_credits_discounted
      INTO v_paid_credits_standard, v_paid_credits_discounted
    FROM users
    WHERE wallet_address = p_drawer_wallet_address
    FOR UPDATE;

    IF v_paid_credits_standard > 0 THEN
      -- Standard credits: 0.001 SOL/line (10-pack @ 0.01 SOL)
      UPDATE users
        SET line_credits_standard = line_credits_standard - 1
      WHERE wallet_address = p_drawer_wallet_address;
      v_revenue_per_line := 0.001;

    ELSIF v_paid_credits_discounted > 0 THEN
      -- Discounted credits: 0.0008 SOL/line (50-pack @ 0.04 SOL)
      UPDATE users
        SET line_credits_discounted = line_credits_discounted - 1
      WHERE wallet_address = p_drawer_wallet_address;
      v_revenue_per_line := 0.0008;

    ELSE
      RAISE EXCEPTION 'Insufficient credits';
    END IF;

    -- Split revenue: add streamer share to their unclaimed balance
    v_streamer_share := v_revenue_per_line * v_streamer_share_rate;

    UPDATE revenue
      SET unclaimed_sol = unclaimed_sol + v_streamer_share
    WHERE streamer_wallet_address = v_streamer_wallet_address;

    -- Log the gross per-line revenue in transactions for accounting
    INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
    VALUES (p_drawer_wallet_address, 'draw_line', v_revenue_per_line, 'Session ID: ' || p_session_id);
  END IF;

  -- Insert the drawing itself and return it for realtime broadcasting
  RETURN QUERY
  INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data)
  VALUES (p_session_id, p_drawer_wallet_address, p_drawing_data)
  RETURNING *;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
