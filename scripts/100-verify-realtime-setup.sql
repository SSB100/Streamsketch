-- Verify Realtime is properly configured
-- Check if Realtime is enabled for required tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('drawings', 'sessions', 'users');

-- Check RLS policies for Realtime
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('drawings', 'sessions', 'users');

-- Verify Realtime publications
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Check if anon role has proper permissions
SELECT grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name IN ('drawings', 'sessions', 'users')
AND grantee = 'anon';
