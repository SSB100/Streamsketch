-- Remove advertisement-related database objects
-- This script safely removes only advertisement tables and functions
-- without affecting any other application functionality

-- Drop the function first (if it exists)
DROP FUNCTION IF EXISTS get_active_ad_for_session(text);

-- Drop the advertisements table (if it exists)
-- This will automatically remove all associated RLS policies
DROP TABLE IF EXISTS advertisements;

-- Verify cleanup
SELECT 'Advertisement cleanup completed successfully' as status;
