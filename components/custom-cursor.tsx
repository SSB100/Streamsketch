"use client"

import { useEffect, useState } from "react"

interface CustomCursorProps {
  isDrawing?: boolean
  brushSize?: number
  color?: string
}

export function CustomCursor({ isDrawing = false, brushSize = 5, color = "#00ff00" }: CustomCursorProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
      setIsVisible(true)
    }

    const hideCursor = () => setIsVisible(false)

    document.addEventListener("mousemove", updatePosition)
    document.addEventListener("mouseleave", hideCursor)

    return () => {
      document.removeEventListener("mousemove", updatePosition)
      document.removeEventListener("mouseleave", hideCursor)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div
      className="fixed pointer-events-none z-50 rounded-full border-2 border-white mix-blend-difference"
      style={{
        left: position.x - brushSize / 2,
        top: position.y - brushSize / 2,
        width: brushSize,
        height: brushSize,
        backgroundColor: isDrawing ? color : "transparent",
        borderColor: color,
        transform: "translate(-50%, -50%)",
      }}
    />
  )
}

export default CustomCursor
