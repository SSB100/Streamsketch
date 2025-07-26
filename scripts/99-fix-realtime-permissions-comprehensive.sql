-- Comprehensive fix for Supabase Realtime permissions
-- This addresses the "Realtime connection error"

-- First, check what tables actually exist in our schema
DO $$
DECLARE
    table_exists boolean;
BEGIN
    -- Check if session_free_line_credits exists (correct table name)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'session_free_line_credits'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Found session_free_line_credits table';
        ALTER TABLE session_free_line_credits ENABLE ROW LEVEL SECURITY;
    ELSE
        RAISE NOTICE 'session_free_line_credits table does not exist';
    END IF;
    
    -- Check if session_free_nuke_credits exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'session_free_nuke_credits'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Found session_free_nuke_credits table';
        ALTER TABLE session_free_nuke_credits ENABLE ROW LEVEL SECURITY;
    ELSE
        RAISE NOTICE 'session_free_nuke_credits table does not exist';
    END IF;
END $$;

-- Enable RLS on core tables that definitely exist
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Safely manage realtime publication
DO $$
BEGIN
    -- Remove tables from publication if they exist
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'drawings'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE drawings;
        RAISE NOTICE 'Removed drawings from realtime publication';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE sessions;
        RAISE NOTICE 'Removed sessions from realtime publication';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'users'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE users;
        RAISE NOTICE 'Removed users from realtime publication';
    END IF;
END $$;

-- Add tables back to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE drawings;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to drawings" ON drawings;
DROP POLICY IF EXISTS "Allow authenticated insert to drawings" ON drawings;
DROP POLICY IF EXISTS "Allow public insert to drawings" ON drawings;
DROP POLICY IF EXISTS "drawings_select_policy" ON drawings;
DROP POLICY IF EXISTS "drawings_insert_policy" ON drawings;
DROP POLICY IF EXISTS "sessions_select_policy" ON sessions;
DROP POLICY IF EXISTS "sessions_insert_policy" ON sessions;
DROP POLICY IF EXISTS "sessions_update_policy" ON sessions;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

-- Create comprehensive RLS policies for drawings
CREATE POLICY "drawings_select_policy" ON drawings
    FOR SELECT USING (true);

CREATE POLICY "drawings_insert_policy" ON drawings
    FOR INSERT WITH CHECK (true);

-- Create RLS policies for sessions
CREATE POLICY "sessions_select_policy" ON sessions
    FOR SELECT USING (true);

CREATE POLICY "sessions_insert_policy" ON sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "sessions_update_policy" ON sessions
    FOR UPDATE USING (true);

CREATE POLICY "sessions_delete_policy" ON sessions
    FOR DELETE USING (true);

-- Create RLS policies for users
CREATE POLICY "users_select_policy" ON users
    FOR SELECT USING (true);

CREATE POLICY "users_insert_policy" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "users_update_policy" ON users
    FOR UPDATE USING (true);

-- Create RLS policies for transactions
CREATE POLICY "transactions_select_policy" ON transactions
    FOR SELECT USING (true);

CREATE POLICY "transactions_insert_policy" ON transactions
    FOR INSERT WITH CHECK (true);

-- Create RLS policies for free credit tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'session_free_line_credits') THEN
        DROP POLICY IF EXISTS "free_line_credits_select_policy" ON session_free_line_credits;
        DROP POLICY IF EXISTS "free_line_credits_insert_policy" ON session_free_line_credits;
        DROP POLICY IF EXISTS "free_line_credits_update_policy" ON session_free_line_credits;
        
        CREATE POLICY "free_line_credits_select_policy" ON session_free_line_credits
            FOR SELECT USING (true);
        CREATE POLICY "free_line_credits_insert_policy" ON session_free_line_credits
            FOR INSERT WITH CHECK (true);
        CREATE POLICY "free_line_credits_update_policy" ON session_free_line_credits
            FOR UPDATE USING (true);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'session_free_nuke_credits') THEN
        DROP POLICY IF EXISTS "free_nuke_credits_select_policy" ON session_free_nuke_credits;
        DROP POLICY IF EXISTS "free_nuke_credits_insert_policy" ON session_free_nuke_credits;
        DROP POLICY IF EXISTS "free_nuke_credits_update_policy" ON session_free_nuke_credits;
        
        CREATE POLICY "free_nuke_credits_select_policy" ON session_free_nuke_credits
            FOR SELECT USING (true);
        CREATE POLICY "free_nuke_credits_insert_policy" ON session_free_nuke_credits
            FOR INSERT WITH CHECK (true);
        CREATE POLICY "free_nuke_credits_update_policy" ON session_free_nuke_credits
            FOR UPDATE USING (true);
    END IF;
END $$;

-- Grant necessary permissions for realtime
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Ensure realtime can access the core tables
GRANT SELECT ON drawings TO postgres;
GRANT SELECT ON sessions TO postgres;
GRANT SELECT ON users TO postgres;
GRANT SELECT ON transactions TO postgres;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT ON drawings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT ON transactions TO authenticated;

-- Grant permissions to anon users for read operations
GRANT SELECT ON drawings TO anon;
GRANT SELECT ON sessions TO anon;
GRANT SELECT ON users TO anon;

-- Refresh the realtime publication
SELECT pg_notify('pgrst', 'reload schema');

-- Final verification (fixed loop syntax)
DO $$
DECLARE
    rec RECORD;
    table_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Realtime permissions setup completed successfully';
    RAISE NOTICE 'Tables in realtime publication:';
    
    FOR rec IN 
        SELECT tablename FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        ORDER BY tablename
    LOOP
        RAISE NOTICE '  - %', rec.tablename;
        table_count := table_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Total tables in realtime publication: %', table_count;
END $$;
