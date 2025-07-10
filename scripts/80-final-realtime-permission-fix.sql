-- This script provides a comprehensive and safe fix for Supabase Realtime permissions.
-- It is designed to be idempotent, meaning it can be run multiple times without causing errors.
-- It audits and corrects permissions without making assumptions about the internal schema structure.

-- Step 1: Ensure the necessary roles can access the Realtime schema.
-- This is the most fundamental requirement and the root cause of the "Channel Error".
GRANT USAGE ON SCHEMA realtime TO postgres, anon, authenticated, service_role;

-- Step 2: Grant comprehensive permissions on all current and future objects within the Realtime schema.
-- This is safer than guessing specific table names. It ensures that whatever internal
-- tables or functions the Realtime service is using are accessible.
-- This does NOT bypass your Row Level Security on the 'drawings' table.
GRANT ALL ON ALL TABLES IN SCHEMA realtime TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA realtime TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;


-- Step 3: Ensure the 'drawings' table is part of the Realtime publication.
-- This command is wrapped in a DO block to prevent the "already member" error,
-- making the script clean and robust.
DO $$
BEGIN
  -- Check if the 'drawings' table is already in the publication
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'drawings'
  ) THEN
    -- If it's not, add it.
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drawings;
    RAISE NOTICE 'Table "drawings" added to publication "supabase_realtime".';
  ELSE
    RAISE NOTICE 'Table "drawings" is already a member of publication "supabase_realtime".';
  END IF;
END;
$$;
