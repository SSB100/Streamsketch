-- Grant usage on the public schema to the necessary roles.
-- This allows the roles to "see" the tables in the schema.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select permissions on all current tables in the public schema.
-- This is necessary for Supabase Realtime to be able to read the data.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- IMPORTANT: For future tables, you'll need to grant permissions as well.
-- This command ensures that any new tables created in the future will
-- automatically have SELECT permissions granted to these roles.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
