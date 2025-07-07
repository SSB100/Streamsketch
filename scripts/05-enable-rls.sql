-- This script locks down your database and is crucial for security.

-- 1. Enable RLS on all tables
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."revenue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."drawings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;

-- By default, RLS denies all access. We now need to create policies
-- to selectively allow access.

-- 2. Create policies for the `sessions` table
-- Allow anyone to read session data. This is needed to join a session.
DROP POLICY IF EXISTS "Allow public read access to sessions" ON "public"."sessions";
CREATE POLICY "Allow public read access to sessions"
ON "public"."sessions"
FOR SELECT
USING (true);

-- 3. Create policies for the `drawings` table
-- Allow anyone to read drawing data. This is needed for the real-time canvas.
DROP POLICY IF EXISTS "Allow public read access to drawings" ON "public"."drawings";
CREATE POLICY "Allow public read access to drawings"
ON "public"."drawings"
FOR SELECT
USING (true);

-- NOTE on other tables (`users`, `revenue`, `transactions`):
-- We are NOT creating any policies for these tables.
-- Because RLS is enabled and the default is DENY, this means
-- no one using the public `anon_key` can read or write to them.
-- Only our trusted server code using the `service_role` key can access them.
-- This is exactly what we want for security.
