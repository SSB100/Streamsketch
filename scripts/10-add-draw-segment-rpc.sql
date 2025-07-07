-- This function allows adding a drawing segment to the database
-- WITHOUT decrementing any user credits. This is used for the parts
-- of a continuous line after the first segment has already been "paid for".
CREATE OR REPLACE FUNCTION add_drawing_segment(
    p_drawer_wallet_address TEXT,
    p_session_id UUID,
    p_drawing_data JSONB
)
RETURNS VOID AS $$
BEGIN
    -- We must still ensure the user exists to satisfy the foreign key constraint.
    IF NOT EXISTS (SELECT 1 FROM users WHERE wallet_address = p_drawer_wallet_address) THEN
        RAISE EXCEPTION 'User with wallet % not found.', p_drawer_wallet_address;
    END IF;

    INSERT INTO drawings (session_id, drawer_wallet_address, drawing_data)
    VALUES (p_session_id, p_drawer_wallet_address, p_drawing_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
