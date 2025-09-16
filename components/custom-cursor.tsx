"use client"

import { useEffect, useState } from "react"

interface CustomCursorProps {
  color?: string
  size?: number
}

export function CustomCursor({ color = "#ffffff", size = 20 }: CustomCursorProps) {
  const [position, setPosition] = useState({ x: -100, y: -100 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      // Ensure we have valid numbers
      const x = typeof e.clientX === "number" && !isNaN(e.clientX) ? e.clientX : -100
      const y = typeof e.clientY === "number" && !isNaN(e.clientY) ? e.clientY : -100

      setPosition({ x, y })
    }

    const handleMouseEnter = () => setIsVisible(true)
    const handleMouseLeave = () => setIsVisible(false)

    document.addEventListener("mousemove", updatePosition)
    document.addEventListener("mouseenter", handleMouseEnter)
    document.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      document.removeEventListener("mousemove", updatePosition)
      document.removeEventListener("mouseenter", handleMouseEnter)
      document.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  // Don't render if position is invalid or not visible
  if (!isVisible || isNaN(position.x) || isNaN(position.y)) return null

  return (
    <div
      className="fixed pointer-events-none z-50 rounded-full border-2 border-white shadow-lg transition-opacity duration-150"
      style={{
        left: `${position.x - size / 2}px`,
        top: `${position.y - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        opacity: 0.7,
      }}
    />
  )
}

export default CustomCursor
