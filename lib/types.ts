export type Point = { x: number; y: number }

export type Drawing = {
  id?: number
  drawing_data: {
    points: Point[]
    color: string
    lineWidth: number
  }
  drawer_wallet_address: string
  created_at: string // Add timestamp for race condition handling
}

export type Advertisement = {
  filePath: string
  fileType: "mp4" | "gif"
  fileName: string
}
