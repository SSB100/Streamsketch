"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface NukeAnimationOverlayProps {
  isVisible: boolean
  animationId: string
  username: string | null
  onComplete: () => void
}

export function NukeAnimationOverlay({ isVisible, animationId, username, onComplete }: NukeAnimationOverlayProps) {
  const [showVideo, setShowVideo] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timeoutRef = useRef<number | null>(null)
  const errorTimeoutRef = useRef<number | null>(null)

  // Clear timeouts on cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
      if (errorTimeoutRef.current) {
        window.clearTimeout(errorTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isVisible) {
      setShowVideo(false)
      setVideoError(false)

      // Clear any existing timeouts
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
      if (errorTimeoutRef.current) {
        window.clearTimeout(errorTimeoutRef.current)
      }

      // Show username first, then video after 1 second
      timeoutRef.current = window.setTimeout(() => {
        setShowVideo(true)
      }, 1000)

      // Failsafe: if video doesn't load or complete within 8 seconds, force complete
      errorTimeoutRef.current = window.setTimeout(() => {
        console.warn("[Nuke] Forcing completion due to timeout")
        onComplete()
      }, 8000)
    }
  }, [isVisible, onComplete])

  const handleVideoLoad = () => {
    console.log("[Nuke] Video loaded successfully")
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.error("[Nuke] Video play failed:", err)
        setVideoError(true)
        // Complete after 2 seconds if play fails
        setTimeout(onComplete, 2000)
      })
    }
  }

  const handleVideoError = (error: any) => {
    console.error("[Nuke] Video failed to load:", error)
    setVideoError(true)
    // Complete after 2 seconds on error
    setTimeout(onComplete, 2000)
  }

  const handleVideoEnd = () => {
    console.log("[Nuke] Video ended normally")
    // Clear the error timeout since video completed successfully
    if (errorTimeoutRef.current) {
      window.clearTimeout(errorTimeoutRef.current)
    }
    onComplete()
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        {/* Username Display */}
        <AnimatePresence>
          {!showVideo && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="text-center"
            >
              <h2 className="text-4xl font-bold text-white mb-4">
                {username ? `${username} activated a nuke!` : "Someone activated a nuke!"}
              </h2>
              <div className="text-xl text-gray-300">Incoming destruction...</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Display */}
        <AnimatePresence>
          {showVideo && !videoError && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative w-full h-full flex items-center justify-center"
            >
              <video
                ref={videoRef}
                className="max-w-full max-h-full object-contain"
                muted
                playsInline
                onLoadedData={handleVideoLoad}
                onError={handleVideoError}
                onEnded={handleVideoEnd}
                preload="auto"
              >
                <source src={`/nukes/${animationId}.mp4`} type="video/mp4" />
              </video>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        <AnimatePresence>
          {videoError && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="text-center"
            >
              <h2 className="text-4xl font-bold text-red-400 mb-4">💥 NUKE ACTIVATED! 💥</h2>
              <div className="text-xl text-gray-300">
                {username ? `${username} nuked the canvas!` : "The canvas has been nuked!"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
