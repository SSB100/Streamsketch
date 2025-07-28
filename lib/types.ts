export type Point = { x: number; y: number }

export type Drawing = {
  id: number
  drawing_data: {
    points: Point[]
    color: string
    lineWidth: number
  }
  drawer_wallet_address: string
  created_at: string
}

export type Advertisement = {
  filePath: string
  fileType: "video" | "gif" | "image"
  fileName: string
}

export type Session = {
  id: string
  owner_wallet_address: string
  drawings: Drawing[]
}

export type Transaction = {
  id: string
  transaction_type: string
  sol_amount: number
  credit_amount: number
  notes: string
  created_at: string
  signature: string
}

export type UserSession = {
  id: string
  short_code: string
  is_active: boolean
  created_at: string
}

export type FreeCreditSession = {
  session_id: string
  short_code: string
  free_lines_available: number
  free_nukes_available: number
}

export type LeaderboardEntry = {
  rank: number
  username: string
  wallet_address: string
  total_earnings: number
}

export type UserRank = {
  user_rank: number
  total_earnings: number
  total_users_with_earnings: number
}
