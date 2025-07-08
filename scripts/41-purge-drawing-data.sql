-- This script provides a clean slate for the new drawing system
-- by removing all existing drawing and transaction data.
-- It does NOT affect users, sessions, or credit balances.

-- Disable row-level security to ensure we can truncate the tables.
ALTER TABLE drawings DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Truncate the tables to delete all rows efficiently.
TRUNCATE TABLE drawings RESTART IDENTITY CASCADE;
TRUNCATE TABLE transactions RESTART IDENTITY CASCADE;

-- Re-enable row-level security.
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Add a comment to confirm completion.
COMMENT ON TABLE drawings IS 'Drawing data purged on 2025-07-09 for new drawing system implementation.';
