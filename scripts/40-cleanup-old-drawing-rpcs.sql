-- Drop the old batching function as it's been replaced by the atomic stroke function
DROP FUNCTION IF EXISTS public.spend_credits_and_draw_strokes_batch(p_drawer_wallet_address text, p_session_id uuid, p_stroke_count integer, p_segments jsonb[]);

-- Drop any other legacy drawing functions if they exist to keep the schema clean.
-- For example, if you had a function that only inserted one segment at a time.
-- DROP FUNCTION IF EXISTS public.spend_credit_and_draw_segment(text,uuid,jsonb);
