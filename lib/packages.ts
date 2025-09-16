export type CreditPackage = {
  id: "small" | "large"
  name: string
  lines: number
  price: number // Total price in SOL
  pricePerLine: number
  isPopular?: boolean
}

const BASE_PRICE_PER_LINE = 0.001 // Updated: 0.01 SOL for 10 lines

export const PURCHASE_PACKAGES: Record<"small" | "large", CreditPackage> = {
  small: {
    id: "small",
    name: "Starter Pack",
    lines: 10,
    price: 0.01, // Updated: 0.01 SOL for 10 lines
    pricePerLine: BASE_PRICE_PER_LINE,
  },
  large: {
    id: "large",
    name: "Creator Pack",
    lines: 50,
    price: 0.03, // Updated: 0.03 SOL for 50 lines
    pricePerLine: 0.0006, // 0.03 / 50 = 0.0006 per line
    isPopular: true,
  },
}
