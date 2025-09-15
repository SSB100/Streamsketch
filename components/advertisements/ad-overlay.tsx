"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

interface AdOverlayProps {
  isVisible: boolean
  onClose: () => void
  adData?: {
    id: string
    title: string
    description: string
    file_url: string
    file_type: "image" | "video"
    duration: number
  }
}

export function AdOverlay({ isVisible, onClose, adData }: AdOverlayProps) {
  const [countdown, setCountdown] = useState(15)
  const [canClose, setCanClose] = useState(false)
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const [mediaError, setMediaError] = useState(false)

  const countdownIntervalRef = useRef<number | null>(null)
  const failsafeTimeoutRef = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Clear all timers on cleanup
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current)
      }
      if (failsafeTimeoutRef.current) {
        window.clearTimeout(failsafeTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isVisible) {
      setCountdown(15)
      setCanClose(false)
      setMediaLoaded(false)
      setMediaError(false)

      // Clear any existing timers
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current)
      }
      if (failsafeTimeoutRef.current) {
        window.clearTimeout(failsafeTimeoutRef.current)
      }

      // Start countdown
      countdownIntervalRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanClose(true)
            if (countdownIntervalRef.current) {
              window.clearInterval(countdownIntervalRef.current)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Failsafe: force close after 20 seconds regardless of countdown
      failsafeTimeoutRef.current = window.setTimeout(() => {
        console.warn("[Ad] Failsafe timeout reached, forcing close")
        onClose()
      }, 20000)
    } else {
      // Clean up when not visible
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current)
      }
      if (failsafeTimeoutRef.current) {
        window.clearTimeout(failsafeTimeoutRef.current)
      }
    }
  }, [isVisible, onClose])

  const handleClose = () => {
    if (canClose) {
      // Clear timers before closing
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current)
      }
      if (failsafeTimeoutRef.current) {
        window.clearTimeout(failsafeTimeoutRef.current)
      }
      onClose()
    }
  }

  const handleMediaLoad = () => {
    console.log("[Ad] Media loaded successfully")
    setMediaLoaded(true)
    setMediaError(false)

    // Auto-play video if it's a video
    if (adData?.file_type === "video" && videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn("[Ad] Video autoplay failed:", err)
      })
    }
  }

  const handleMediaError = (error: any) => {
    console.error("[Ad] Media failed to load:", error)
    setMediaError(true)
    setMediaLoaded(false)
  }

  if (!isVisible || !adData) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-4xl max-h-[90vh] w-full mx-4 bg-white rounded-lg overflow-hidden shadow-2xl"
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            disabled={!canClose}
            className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-all ${
              canClose
                ? "bg-red-500 hover:bg-red-600 text-white cursor-pointer"
                : "bg-gray-400 text-gray-600 cursor-not-allowed"
            }`}
            title={canClose ? "Close Ad" : `Wait ${countdown} seconds`}
          >
            <X size={20} />
          </button>

          {/* Countdown Display */}
          {!canClose && (
            <div className="absolute top-4 left-4 z-10 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
              {countdown}s
            </div>
          )}

          {/* Media Content */}
          <div className="relative w-full h-full min-h-[400px] flex items-center justify-center bg-gray-100">
            {!mediaLoaded && !mediaError && <div className="text-gray-500 text-lg">Loading advertisement...</div>}

            {mediaError && (
              <div className="text-center p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{adData.title}</h3>
                <p className="text-gray-600 mb-4">{adData.description}</p>
                <div className="text-red-500">Failed to load media content</div>
              </div>
            )}

            {adData.file_type === "image" && !mediaError && (
              <img
                src={adData.file_url || "/placeholder.svg"}
                alt={adData.title}
                className="max-w-full max-h-full object-contain"
                onLoad={handleMediaLoad}
                onError={handleMediaError}
              />
            )}

            {adData.file_type === "video" && !mediaError && (
              <video
                ref={videoRef}
                className="max-w-full max-h-full object-contain"
                controls
                muted
                loop
                playsInline
                onLoadedData={handleMediaLoad}
                onError={handleMediaError}
                preload="auto"
              >
                <source src={adData.file_url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            )}
          </div>

          {/* Ad Info */}
          {mediaLoaded && !mediaError && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
              <h3 className="text-xl font-bold mb-1">{adData.title}</h3>
              <p className="text-gray-200 text-sm">{adData.description}</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
