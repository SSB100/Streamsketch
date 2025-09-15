"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Maximize, Minimize } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FullscreenWrapperProps {
  children: React.ReactNode
  shortCode: string
}

export function FullscreenWrapper({ children, shortCode }: FullscreenWrapperProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error("Fullscreen toggle failed:", error)
    }
  }

  return (
    <div className="relative h-full w-full">
      {/* Instructions and Session Code - Always visible at top */}
      <div className="absolute left-1/2 top-4 z-40 -translate-x-1/2 transform text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">Visit streamsketch.tech and enter</p>
        <div className="mt-1 text-2xl font-bold text-green-500">★ {shortCode} ★</div>
      </div>

      {/* Fullscreen Toggle Button */}
      <Button
        onClick={toggleFullscreen}
        variant="outline"
        size="icon"
        className="absolute right-4 top-4 z-40 bg-white/90 backdrop-blur-sm hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800"
      >
        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </Button>

      {/* Main Content */}
      <div className="h-full w-full pt-16">{children}</div>
    </div>
  )
}
