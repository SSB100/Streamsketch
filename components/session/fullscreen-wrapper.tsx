"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Maximize, Minimize } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FullscreenWrapperProps {
  children: React.ReactNode
  sessionCode?: string
}

export function FullscreenWrapper({ children, sessionCode }: FullscreenWrapperProps) {
  const [isFullScreen, setIsFullScreen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleFullScreenChange = useCallback(() => {
    setIsFullScreen(document.fullscreenElement !== null)
  }, [])

  useEffect(() => {
    document.addEventListener("fullscreenchange", handleFullScreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreenChange)
    }
  }, [handleFullScreenChange])

  const toggleFullScreen = () => {
    if (!wrapperRef.current) return

    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch((err) => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  return (
    <div ref={wrapperRef} className="relative flex h-screen w-screen items-center justify-center bg-black">
      {children}
      {sessionCode && (
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-300 ${isFullScreen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <div className="bg-black/60 text-white/90 backdrop-blur-md rounded-lg px-6 py-3">
            <p className="text-center font-mono text-4xl font-bold tracking-wider">{sessionCode}</p>
          </div>
        </div>
      )}
      <div className="absolute right-4 bottom-4 z-20">
        <Button
          onClick={toggleFullScreen}
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-white/20"
        >
          {isFullScreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
          <span className="sr-only">{isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}</span>
        </Button>
      </div>
    </div>
  )
}
