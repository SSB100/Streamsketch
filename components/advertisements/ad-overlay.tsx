"use client"

import { useState, useEffect } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Advertisement } from "@/lib/types"

interface AdOverlayProps {
  streamerWalletAddress: string
  customAd: Advertisement | null
}

export function AdOverlay({ streamerWalletAddress, customAd }: AdOverlayProps) {
  const [showAd, setShowAd] = useState(false)
  const [currentAd, setCurrentAd] = useState<Advertisement | null>(null)
  const [isMuted, setIsMuted] = useState(true)

  useEffect(() => {
    const checkAdSchedule = () => {
      const now = new Date()
      const minutes = now.getMinutes()

      // Show custom ads at 0, 30, and 45 minutes past the hour
      // Show default ad at 15 minutes past the hour
      const shouldShowCustomAd = customAd && (minutes === 0 || minutes === 30 || minutes === 45)
      const shouldShowDefaultAd = !customAd || minutes === 15

      if (shouldShowCustomAd) {
        setCurrentAd(customAd)
        setShowAd(true)
      } else if (shouldShowDefaultAd) {
        setCurrentAd({
          filePath: "/ads/default-ad.mp4",
          fileType: "video",
          fileName: "default-ad.mp4",
        })
        setShowAd(true)
      } else {
        setShowAd(false)
        setCurrentAd(null)
      }
    }

    // Check immediately
    checkAdSchedule()

    // Check every minute
    const interval = setInterval(checkAdSchedule, 60000)

    return () => clearInterval(interval)
  }, [customAd])

  const handleAdEnd = () => {
    setShowAd(false)
    setCurrentAd(null)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  if (!showAd || !currentAd) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-4xl w-full mx-4">
        <div className="relative bg-black rounded-lg overflow-hidden">
          {currentAd.fileType === "video" || currentAd.fileType === "mp4" ? (
            <>
              <video
                src={currentAd.filePath}
                autoPlay
                muted={isMuted}
                onEnded={handleAdEnd}
                className="w-full h-auto max-h-[80vh] object-contain"
                controls={false}
              />
              <Button
                onClick={toggleMute}
                variant="ghost"
                size="icon"
                className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </>
          ) : (
            <div className="relative">
              <img
                src={currentAd.filePath || "/placeholder.svg"}
                alt="Advertisement"
                className="w-full h-auto max-h-[80vh] object-contain"
                onLoad={() => {
                  // Auto-close static images after 5 seconds
                  setTimeout(handleAdEnd, 5000)
                }}
              />
            </div>
          )}

          <Button
            onClick={handleAdEnd}
            variant="ghost"
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
          >
            Skip Ad
          </Button>
        </div>
      </div>
    </div>
  )
}
