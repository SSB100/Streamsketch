"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Maximize, Minimize } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdOverlay } from "@/components/advertisements/ad-overlay"
import type { Advertisement } from "@/lib/types"

interface FullscreenWrapperProps {
  children: React.ReactNode
  sessionCode: string
  customAd?: Advertisement | null
}

export function FullscreenWrapper({ children, sessionCode, customAd }: FullscreenWrapperProps) {
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
      console.error("Error toggling fullscreen:", error)
    }
  }

  return (
    <div className="relative h-full w-full">
      {/* Session Info - Always visible at top */}
      <div className="absolute left-4 top-4 z-40 rounded-lg bg-black/70 px-4 py-2 text-white backdrop-blur-sm">
        <div className="text-sm font-medium">
          Visit <span className="text-green-400">streamsketch.tech</span> and enter
        </div>
        <div className="text-lg font-bold text-green-400">★ {sessionCode} ★</div>
      </div>

      {/* Fullscreen Toggle Button */}
      <Button
        onClick={toggleFullscreen}
        variant="outline"
        size="icon"
        className="absolute right-4 top-4 z-40 bg-black/50 text-white hover:bg-black/70"
      >
        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </Button>

      {/* Draw URL Display - Only in fullscreen */}
      {isFullscreen && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-40 -translate-x-1/2 transform rounded-lg bg-black/70 px-4 py-2 text-center text-white backdrop-blur-sm transition-opacity duration-300">
          <div className="text-sm">Draw at:</div>
          <div className="text-lg font-bold text-green-400">streamsketch.tech/{sessionCode}</div>
        </div>
      )}

      {/* Main Content */}
      {children}

      {/* Advertisement Overlay */}
      <AdOverlay customAd={customAd} />
    </div>
  )
}
