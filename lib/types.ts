export interface Point {
  x: number
  y: number
}

// NEW: Represents a full line drawn by a user
export interface Stroke {
  color: string
  lineWidth: number
  segments: { from: Point; to: Point }[]
}

// UPDATED: The drawing_data is now a Stroke object
export interface Drawing {
  id: number
  drawer_wallet_address: string
  drawing_data: Stroke
}
