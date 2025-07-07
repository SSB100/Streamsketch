import { PublicKey } from "@solana/web3.js"

// The app's public wallet address, read from environment variables.
// This is the wallet that receives payments for credits.
export const APP_WALLET_ADDRESS = new PublicKey(
  process.env.NEXT_PUBLIC_APP_WALLET_ADDRESS || "8pYtJvvB8bZYTrYqcmjxpMcuRRqAxRtg5oNQkphKxCcY",
)

export const LINE_CREDIT_PRICE_SOL = 0.02
export const NUKE_CREDIT_PRICE_SOL = 0.03

export const LINES_PER_PURCHASE = 10

// Revenue Distribution
export const STREAMER_REVENUE_SHARE = 0.8 // 80% for the host
export const APP_REVENUE_SHARE = 0.2 // 20% for Haaker (the platform)
