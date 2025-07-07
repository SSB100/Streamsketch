-- Step 1: Add a nullable `username` column to the users table if it doesn't exist.
ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS username TEXT;

-- Step 2: Drop and re-add the unique constraint to ensure it's correctly defined.
-- This prevents two users from having the same name.
ALTER TABLE "public"."users"
DROP CONSTRAINT IF EXISTS users_username_key;

ALTER TABLE "public"."users"
ADD CONSTRAINT users_username_key UNIQUE (username);

-- Step 3: Drop and re-add the check constraint for a valid username format.
-- This ensures usernames are between 3-15 characters and only contain letters, numbers, and underscores.
ALTER TABLE "public"."users"
DROP CONSTRAINT IF EXISTS username_format;

ALTER TABLE "public"."users"
ADD CONSTRAINT username_format CHECK (
  username IS NULL OR -- Allow null usernames
  (char_length(username) >= 3 AND char_length(username) <= 15 AND username ~ '^[a-zA-Z0-9_]+$')
);
