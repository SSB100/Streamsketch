"use client"

import { useState, useEffect, useRef } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Advertisement } from "@/lib/types"

interface AdOverlayProps {
  streamerWalletAddress: string
  customAd: Advertisement | null
}

const AD_SLOTS = [0, 15, 30, 45]
const DEFAULT_AD_SLOT = 15

const DEFAULT_AD: Advertisement = {
  filePath: "/ads/default-ad.mp4",
  fileType: "video",
  fileName: "default-ad.mp4",
}

export function AdOverlay({ streamerWalletAddress, customAd }: AdOverlayProps) {
  const [showAd, setShowAd] = useState(false)
  const [currentAd, setCurrentAd] = useState<Advertisement | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const checkAdSchedule = () => {
      const now = new Date()
      const minutes = now.getMinutes()

      if (AD_SLOTS.includes(minutes)) {
        let adToPlay: Advertisement = DEFAULT_AD

        if (minutes === DEFAULT_AD_SLOT) {
          adToPlay = DEFAULT_AD
        } else if (customAd) {
          adToPlay = customAd
        }
        // If it's an ad slot other than 15 and there's no custom ad, it will correctly fall back to the default ad.

        setCurrentAd(adToPlay)
        setShowAd(true)
      } else {
        // This ensures the ad is not shown on non-ad minutes
        setShowAd(false)
        setCurrentAd(null)
      }
    }

    // This function ensures the check happens precisely at the start of each minute.
    const scheduleNextCheck = () => {
      const now = new Date()
      const seconds = now.getSeconds()
      const milliseconds = now.getMilliseconds()
      const msUntilNextMinute = (60 - seconds) * 1000 - milliseconds

      setTimeout(() => {
        checkAdSchedule() // Run the check once aligned to the minute.
        // Then, set a precise interval to run every 60 seconds.
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = setInterval(checkAdSchedule, 60000)
      }, msUntilNextMinute)
    }

    scheduleNextCheck()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
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
                key={currentAd.filePath}
                src={currentAd.filePath}
                autoPlay
                muted={isMuted}
                onEnded={handleAdEnd}
                className="w-full h-auto max-h-[80vh] object-contain"
                controls={false}
                playsInline
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
                  // Auto-close static images after 10 seconds
                  setTimeout(handleAdEnd, 10000)
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
