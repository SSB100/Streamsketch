CREATE OR REPLACE FUNCTION public.spend_credit_and_draw_stroke(
  p_drawer_wallet_address text,
  p_session_id uuid,
  p_segments jsonb[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_free_session_credit boolean;
  v_has_paid_credit boolean;
  v_streamer_wallet_address text;
  segment jsonb;
BEGIN
  -- 1. Check for free credits first
  SELECT EXISTS (
    SELECT 1
    FROM public.session_free_line_credits sflc
    WHERE sflc.user_wallet_address = p_drawer_wallet_address
      AND sflc.session_id = p_session_id
      AND sflc.amount > 0
  ) INTO v_has_free_session_credit;

  IF v_has_free_session_credit THEN
    -- Use a free credit
    UPDATE public.session_free_line_credits
    SET amount = amount - 1
    WHERE user_wallet_address = p_drawer_wallet_address
      AND session_id = p_session_id;
  ELSE
    -- 2. Check for paid credits if no free ones are available
    SELECT (line_credits_standard > 0 OR line_credits_discounted > 0)
    INTO v_has_paid_credit
    FROM public.users
    WHERE wallet_address = p_drawer_wallet_address;

    IF COALESCE(v_has_paid_credit, false) THEN
      -- Use a paid credit (prefer discounted)
      UPDATE public.users
      SET
        line_credits_discounted = CASE
          WHEN line_credits_discounted > 0 THEN line_credits_discounted - 1
          ELSE line_credits_discounted
        END,
        line_credits_standard = CASE
          WHEN line_credits_discounted <= 0 AND line_credits_standard > 0 THEN line_credits_standard - 1
          ELSE line_credits_standard
        END
      WHERE wallet_address = p_drawer_wallet_address;

      -- Add revenue for the streamer
      SELECT owner_wallet_address INTO v_streamer_wallet_address
      FROM public.sessions
      WHERE id = p_session_id;

      IF v_streamer_wallet_address IS NOT NULL THEN
        UPDATE public.revenue
        SET unclaimed_sol = unclaimed_sol + (0.00005 * 0.5) -- 0.00005 SOL per line, 50% share
        WHERE streamer_wallet_address = v_streamer_wallet_address;
      END IF;

    ELSE
      -- 3. No credits available, raise an error
      RAISE EXCEPTION 'Insufficient line credits.';
    END IF;
  END IF;

  -- 4. If credit was successfully spent, insert all drawing segments
  FOREACH segment IN ARRAY p_segments
  LOOP
    INSERT INTO public.drawings (session_id, drawer_wallet_address, drawing_data)
    VALUES (p_session_id, p_drawer_wallet_address, segment);
  END LOOP;

END;
$$;
