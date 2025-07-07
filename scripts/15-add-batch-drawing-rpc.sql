-- This function allows inserting multiple drawing segments in a single database call.
-- It takes a JSON array of drawing data objects and inserts them all.
-- This is much more efficient than inserting one row at a time.

CREATE OR REPLACE FUNCTION add_drawing_segments(
    p_session_id UUID,
    p_segments JSONB -- e.g., '[{"drawer": "...", "data": {...}}, {"drawer": "...", "data": {...}}]'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data)
    SELECT
        p_session_id,
        (segment->>'drawer_wallet_address')::TEXT,
        (segment->'drawing_data')::JSONB
    FROM jsonb_array_elements(p_segments) AS segment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
