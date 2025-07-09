-- Step 1: Ensure the 'created_at' column exists on the session_free_line_credits table.
-- This is idempotent and safe to run multiple times.
ALTER TABLE public.session_free_line_credits
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Step 2: Ensure the 'created_at' column exists on the session_free_nuke_credits table.
-- This is also idempotent.
ALTER TABLE public.session_free_nuke_credits
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Step 3: Drop the old, problematic function to allow for a clean recreation.
DROP FUNCTION IF EXISTS public.get_user_free_credit_sessions(p_user_wallet_address text);

-- Step 4: Create the new, fully corrected function.
-- This version correctly joins sessions, filters for active ones, and handles credits.
CREATE OR REPLACE FUNCTION public.get_user_free_credit_sessions(p_user_wallet_address text)
RETURNS TABLE(session_id uuid, session_code text, free_lines integer, free_nukes integer, granted_at timestamptz)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_sessions AS (
    -- Get all unique session IDs where the user has either line or nuke credits
    SELECT s.id AS session_id, s.short_code
    FROM public.sessions s
    WHERE s.is_active = true AND (
      EXISTS (
        SELECT 1 FROM public.session_free_line_credits l
        WHERE l.user_wallet_address = p_user_wallet_address AND l.session_id = s.id AND l.amount > 0
      ) OR EXISTS (
        SELECT 1 FROM public.session_free_nuke_credits n
        WHERE n.user_wallet_address = p_user_wallet_address AND n.session_id = s.id AND n.amount > 0
      )
    )
  ),
  line_credits AS (
    -- Get the line credits for those sessions
    SELECT l.session_id, l.amount, l.created_at
    FROM public.session_free_line_credits l
    WHERE l.user_wallet_address = p_user_wallet_address AND l.session_id IN (SELECT us.session_id FROM user_sessions us)
  ),
  nuke_credits AS (
    -- Get the nuke credits for those sessions
    SELECT n.session_id, n.amount, n.created_at
    FROM public.session_free_nuke_credits n
    WHERE n.user_wallet_address = p_user_wallet_address AND n.session_id IN (SELECT us.session_id FROM user_sessions us)
  )
  -- Final join to combine the data
  SELECT
    us.session_id,
    us.short_code,
    COALESCE(lc.amount, 0)::integer AS free_lines,
    COALESCE(nc.amount, 0)::integer AS free_nukes,
    -- Use the most recent grant time between lines and nukes
    GREATEST(lc.created_at, nc.created_at, now() - interval '1 year') AS granted_at
  FROM user_sessions us
  LEFT JOIN line_credits lc ON us.session_id = lc.session_id
  LEFT JOIN nuke_credits nc ON us.session_id = nc.session_id;
END;
$$;
