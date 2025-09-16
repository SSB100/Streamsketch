-- Add is_free column to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE;

-- Create function to record drawing with free session support
CREATE OR REPLACE FUNCTION record_drawing_with_free_session_support(
  p_drawer_wallet_address TEXT,
  p_session_id UUID,
  p_drawing_data JSONB
)
RETURNS TABLE(
  id UUID,
  drawing_data JSONB,
  drawer_wallet_address TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_is_free BOOLEAN;
  v_new_drawing_id UUID;
  v_owner_wallet TEXT;
BEGIN
  -- Check if session is free
  SELECT is_free, owner_wallet_address INTO v_session_is_free, v_owner_wallet
  FROM sessions 
  WHERE sessions.id = p_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  
  -- If session is NOT free, check credits and deduct
  IF NOT v_session_is_free THEN
    -- Check if user has credits (existing logic)
    IF NOT EXISTS (
      SELECT 1 FROM users 
      WHERE wallet_address = p_drawer_wallet_address 
      AND (line_credits_standard > 0 OR line_credits_discounted > 0)
    ) THEN
      -- Check for free credits
      IF NOT EXISTS (
        SELECT 1 FROM session_free_line_credits 
        WHERE user_wallet_address = p_drawer_wallet_address 
        AND session_id = p_session_id 
        AND amount > 0
      ) THEN
        RAISE EXCEPTION 'Insufficient credits';
      END IF;
      
      -- Use free credit
      UPDATE session_free_line_credits 
      SET amount = amount - 1 
      WHERE user_wallet_address = p_drawer_wallet_address 
      AND session_id = p_session_id 
      AND amount > 0;
    ELSE
      -- Use paid credit (prioritize discounted first)
      UPDATE users 
      SET line_credits_discounted = CASE 
        WHEN line_credits_discounted > 0 THEN line_credits_discounted - 1
        ELSE line_credits_discounted
      END,
      line_credits_standard = CASE 
        WHEN line_credits_discounted > 0 THEN line_credits_standard
        ELSE line_credits_standard - 1
      END
      WHERE wallet_address = p_drawer_wallet_address;
      
      -- Add revenue for streamer (only for paid sessions)
      INSERT INTO revenue (streamer_wallet_address, unclaimed_sol, total_revenue)
      VALUES (v_owner_wallet, 0.001, 0.001)
      ON CONFLICT (streamer_wallet_address)
      DO UPDATE SET 
        unclaimed_sol = revenue.unclaimed_sol + 0.001,
        total_revenue = revenue.total_revenue + 0.001;
    END IF;
  END IF;
  
  -- Insert the drawing
  INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data)
  VALUES (p_session_id, p_drawer_wallet_address, p_drawing_data)
  RETURNING drawings.id INTO v_new_drawing_id;
  
  -- Return the new drawing
  RETURN QUERY
  SELECT 
    drawings.id,
    drawings.drawing_data,
    drawings.drawer_wallet_address,
    drawings.created_at
  FROM drawings
  WHERE drawings.id = v_new_drawing_id;
END;
$$;
