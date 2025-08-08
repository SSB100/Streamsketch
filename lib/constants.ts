import { PublicKey } from "@solana/web3.js"

/**
 * Central constants for pricing and platform settings.
 * NOTE:
 * - Historical transactions are not affected; these values only impact new purchases.
 * - We keep existing exports to avoid breaking imports elsewhere.
 */

// The app's public wallet address, read from environment variables.
// This is the wallet that receives payments for credits.
export const APP_WALLET_ADDRESS = new PublicKey(
  process.env.NEXT_PUBLIC_APP_WALLET_ADDRESS || "8pYtJvvB8bZYTrYqcmjxpMcuRRqAxRtg5oNQkphKxCcY",
)

// New pricing (effective immediately)
export const DEFAULT_NUKE_PRICE_SOL = 0.01
export const CUSTOM_NUKE_PRICE_SOL = 0.02

// Legacy exports (kept for compatibility)
// LINE_CREDIT_PRICE_SOL historically represented the 10-line pack price.
export const LINE_CREDIT_PRICE_SOL = 0.01 // 10 lines for 0.01 SOL (updated)
// If a single nuke price is needed by some legacy code, use default price:
export const NUKE_CREDIT_PRICE_SOL = DEFAULT_NUKE_PRICE_SOL // 0.01 SOL (updated)

// Other settings
export const LINES_PER_PURCHASE = 10

// Revenue Distribution
export const STREAMER_REVENUE_SHARE = 0.8 // 80% for the host
export const APP_REVENUE_SHARE = 0.2 // 20% for the platform
