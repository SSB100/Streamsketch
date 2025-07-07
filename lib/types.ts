export type Point = {
  x: number
  y: number
}

export type Drawing = {
  id: number
  drawer_wallet_address: string
  drawing_data: {
    from: Point
    to: Point
    color: string
    lineWidth: number
  }
}

export type UserData = {
  lineCredits: number
  unclaimedSol: number
  totalClaimedSol: number
  username: string | null
  linesGifted: number
  nukesGifted: number
  totalFreeLines: number
  totalFreeNukes: number
}

export type Session = {
  id: string
  short_code: string
  is_active: boolean
  created_at: string
}

export type Transaction = {
  id: number
  transaction_type: string
  sol_amount: number | null
  credit_amount: number | null
  notes: string | null
  created_at: string
  signature: string | null
}

export type FreeCreditSession = {
  session_id: string
  short_code: string
  free_lines: number
  free_nukes: number
}
