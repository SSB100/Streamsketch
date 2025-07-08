-- WARNING: This script will permanently delete ALL data from your tables.
-- This is intended for a clean reset during development.
-- DO NOT run this in a production environment with live user data.

-- The TRUNCATE command is used to quickly delete all rows from a set of tables.
-- RESTART IDENTITY resets the sequences for auto-incrementing keys (like IDs).
-- CASCADE automatically truncates all tables that have foreign-key references
-- to any of the listed tables, ensuring a complete wipe.

TRUNCATE
  "public"."users",
  "public"."sessions",
  "public"."drawings",
  "public"."revenue",
  "public"."transactions",
  "public"."gifting_limits",
  "public"."session_free_line_credits",
  "public"."session_free_nuke_credits"
RESTART IDENTITY CASCADE;

-- Optional: Add a confirmation message.
SELECT 'All user and session data has been wiped clean.';
