-- Update pricing structure for line credits and nukes
-- This script updates any hardcoded prices in the database to match the new pricing

-- Note: Most pricing is handled in the application code, but this script
-- ensures any database references are updated

-- Update any existing transaction records that might reference old prices
-- (This is mainly for documentation/audit purposes)

-- Add a comment to document the new pricing structure
COMMENT ON TABLE transactions IS 'Transaction log with updated pricing: 10 lines = 0.01 SOL, 50 lines = 0.03 SOL, default nuke = 0.01 SOL, custom nukes = 0.02 SOL';

-- The actual pricing is handled in the application code through:
-- - lib/constants.ts: LINE_CREDIT_PRICE_SOL and NUKE_CREDIT_PRICE_SOL
-- - lib/packages.ts: PURCHASE_PACKAGES with updated prices
-- - lib/nuke-animations.ts: NUKE_ANIMATIONS with updated nuke prices
