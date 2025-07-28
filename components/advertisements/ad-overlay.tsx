"use client"

import { useState, useEffect, useRef } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Advertisement } from "@/lib/types"

interface AdOverlayProps {
  customAd: Advertisement | null
}

const AD_SLOTS = [0, 15, 30, 45]
const DEFAULT_AD_SLOT = 15

const DEFAULT_AD: Advertisement = {
  filePath: "/ads/default-ad-image.png",
  fileType: "image",
  fileName: "default-ad-image.png",
}

export function AdOverlay({ customAd }: AdOverlayProps) {
  const [showAd, setShowAd] = useState(false)
  const [currentAd, setCurrentAd] = useState<Advertisement | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const adTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const checkAdSchedule = () => {
      const now = new Date()
      const minutes = now.getMinutes()

      if (AD_SLOTS.includes(minutes)) {
        let adToPlay: Advertisement = DEFAULT_AD

        // If no custom ad exists, show default ad at all slots
        // If custom ad exists, show default ad only at the 15-minute slot
        if (customAd && minutes !== DEFAULT_AD_SLOT) {
          adToPlay = customAd
        } else {
          adToPlay = DEFAULT_AD
        }

        setCurrentAd(adToPlay)
        setShowAd(true)

        // Set auto-close timer for image ads (15 seconds)
        if (adToPlay.fileType === "image") {
          adTimeoutRef.current = setTimeout(() => {
            handleAdEnd()
          }, 15000) // 15 seconds
        }
      } else {
        setShowAd(false)
        setCurrentAd(null)
      }
    }

    const scheduleNextCheck = () => {
      const now = new Date()
      const seconds = now.getSeconds()
      const milliseconds = now.getMilliseconds()
      const msUntilNextMinute = (60 - seconds) * 1000 - milliseconds

      setTimeout(() => {
        checkAdSchedule()
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = setInterval(checkAdSchedule, 60000)
      }, msUntilNextMinute)
    }

    scheduleNextCheck()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (adTimeoutRef.current) {
        clearTimeout(adTimeoutRef.current)
      }
    }
  }, [customAd])

  const handleAdEnd = () => {
    setShowAd(false)
    setCurrentAd(null)
    if (adTimeoutRef.current) {
      clearTimeout(adTimeoutRef.current)
      adTimeoutRef.current = null
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  if (!showAd || !currentAd) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-4">
        <div className="relative overflow-hidden bg-black rounded-lg">
          {currentAd.fileType === "video" ? (
            <>
              <video
                key={currentAd.filePath}
                src={currentAd.filePath || "/placeholder.svg"}
                autoPlay
                muted={isMuted}
                onEnded={handleAdEnd}
                className="object-contain w-full h-auto max-h-[80vh]"
                controls={false}
                playsInline
              />
              <Button
                onClick={toggleMute}
                variant="ghost"
                size="icon"
                className="absolute bottom-4 right-4 text-white bg-black/50 hover:bg-black/70"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </>
          ) : (
            <div className="relative">
              <img
                src={currentAd.filePath || "/placeholder.svg"}
                alt="Advertisement"
                className="object-contain w-full h-auto max-h-[80vh]"
              />
              {/* Show countdown for image ads */}
              <div className="absolute bottom-4 left-4 text-white bg-black/50 px-2 py-1 rounded text-sm">
                {currentAd.fileType === "image" && "15s"}
              </div>
            </div>
          )}

          <Button
            onClick={handleAdEnd}
            variant="ghost"
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70"
          >
            Skip Ad
          </Button>
        </div>
      </div>
    </div>
  )
}
