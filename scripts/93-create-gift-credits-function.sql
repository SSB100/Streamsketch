-- Create the gift_credits_to_session function

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS gift_credits_to_session(TEXT, UUID, TEXT, INTEGER, INTEGER);

-- Placeholder for the actual function creation
SELECT 'Gift credits function will be created in script 96' as note;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION gift_credits_to_session(TEXT, UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION gift_credits_to_session(TEXT, UUID, TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION gift_credits_to_session(TEXT, UUID, TEXT, INTEGER, INTEGER) TO service_role;
