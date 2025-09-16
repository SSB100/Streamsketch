"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useIsMobile } from "@/hooks/use-mobile"

const CustomCursor = () => {
  const isMobile = useIsMobile()
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 })

  useEffect(() => {
    const mouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", mouseMove)

    return () => {
      window.removeEventListener("mousemove", mouseMove)
    }
  }, [])

  if (isMobile) {
    return null
  }

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-50 h-8 w-8 rounded-full bg-neon-pink/50 blur-lg"
      animate={{
        x: mousePosition.x - 16,
        y: mousePosition.y - 16,
      }}
      transition={{
        type: "spring",
        damping: 20,
        stiffness: 200,
        mass: 0.5,
      }}
    />
  )
}

export default CustomCursor
