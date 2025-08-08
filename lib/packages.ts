/**
 * Line credit packages and pricing.
 *
 * Effective immediately:
 * - 10 lines: 0.01 SOL (0.001 SOL/line)
 * - 50 lines: 0.04 SOL (0.0008 SOL/line)
 *
 * Past transactions remain unchanged; these values affect only new purchases.
 */

export type CreditPackage = {
  id: "small" | "large"
  name: string
  lines: number
  price: number // Total price in SOL
  pricePerLine: number
  isPopular?: boolean
}

// Base price per line for the small pack (10 lines for 0.01 => 0.001 SOL/line)
const BASE_PRICE_PER_LINE = 0.001
// Discounted price per line for the large pack (50 lines for 0.04 => 0.0008 SOL/line)
const DISCOUNTED_PRICE_PER_LINE = 0.0008

export const PURCHASE_PACKAGES: Record<"small" | "large", CreditPackage> = {
  small: {
    id: "small",
    name: "Starter Pack",
    lines: 10,
    price: 0.01,
    pricePerLine: BASE_PRICE_PER_LINE, // 0.001
  },
  large: {
    id: "large",
    name: "Creator Pack",
    lines: 50,
    price: 50 * DISCOUNTED_PRICE_PER_LINE, // 0.04 SOL
    pricePerLine: DISCOUNTED_PRICE_PER_LINE, // 0.0008
    isPopular: true,
  },
}
