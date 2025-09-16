import { PublicKey } from "@solana/web3.js"

// The app's public wallet address, read from environment variables.
// This is the wallet that receives payments for credits.
export const APP_WALLET_ADDRESS = new PublicKey(
  process.env.NEXT_PUBLIC_APP_WALLET_ADDRESS || "8pYtJvvB8bZYTrYqcmjxpMcuRRqAxRtg5oNQkphKxCcY",
)

// Updated pricing structure
export const LINE_CREDIT_PRICE_SOL = 0.001 // 0.01 SOL for 10 lines = 0.001 per line
export const LINE_CREDIT_PRICE_SOL_DISCOUNTED = 0.0006 // 0.03 SOL for 50 lines = 0.0006 per line
export const NUKE_CREDIT_PRICE_SOL = 0.01 // 0.01 SOL for default nuke

export const LINES_PER_PURCHASE = 10

// Revenue Distribution
export const STREAMER_REVENUE_SHARE = 0.8 // 80% for the host
export const APP_REVENUE_SHARE = 0.2 // 20% for Haaker (the platform)
