export type Point = { x: number; y: number }

export type Drawing = {
  id?: number
  drawing_data: {
    from: Point
    to: Point
    color: string
    lineWidth: number
  }
  drawer_wallet_address: string
}
