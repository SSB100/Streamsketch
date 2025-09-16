export type CreditPackage = {
  id: "small" | "large"
  name: string
  lines: number
  price: number // Total price in SOL
  pricePerLine: number
  isPopular?: boolean
}

const BASE_PRICE_PER_LINE = 0.002 // 0.02 SOL for 10 lines

export const PURCHASE_PACKAGES: Record<"small" | "large", CreditPackage> = {
  small: {
    id: "small",
    name: "Starter Pack",
    lines: 10,
    price: 0.02,
    pricePerLine: BASE_PRICE_PER_LINE,
  },
  large: {
    id: "large",
    name: "Creator Pack",
    lines: 50,
    // 25% discount per line (0.002 * 0.75 = 0.0015)
    price: 50 * (BASE_PRICE_PER_LINE * 0.75), // 0.075 SOL
    pricePerLine: BASE_PRICE_PER_LINE * 0.75,
    isPopular: true,
  },
}
