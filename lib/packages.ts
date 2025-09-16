export const PURCHASE_PACKAGES = {
  small: {
    id: "small" as const,
    name: "10 Lines",
    lines: 10,
    price: 0.01, // 0.01 SOL for 10 lines = 0.001 SOL per line
    description: "Perfect for quick sketches",
    popular: false,
  },
  large: {
    id: "large" as const,
    name: "50 Lines",
    lines: 50,
    price: 0.03, // 0.03 SOL for 50 lines = 0.0006 SOL per line (40% discount)
    description: "Best value for artists",
    popular: true,
  },
} as const

export type PurchasePackageId = keyof typeof PURCHASE_PACKAGES
