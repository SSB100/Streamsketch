"use client"

import { useState, useEffect, useCallback } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Advertisement } from "@/lib/types"

interface AdOverlayProps {
  customAd?: Advertisement | null
}

const AD_SLOTS = [0, 15, 30, 45] // Minutes when ads can show
const DEFAULT_AD_SLOT = 15 // Default ad shows at 15-minute mark when custom ad exists

const DEFAULT_AD: Advertisement = {
  filePath: "/ads/default-ad-image.png",
  fileType: "image",
  fileName: "default-ad-image.png",
}

export function AdOverlay({ customAd }: AdOverlayProps) {
  const [showAd, setShowAd] = useState(false)
  const [currentAd, setCurrentAd] = useState<Advertisement | null>(null)
  const [countdown, setCountdown] = useState(0)

  const shouldShowAd = useCallback((currentMinute: number): boolean => {
    return AD_SLOTS.includes(currentMinute)
  }, [])

  const getAdForSlot = useCallback(
    (currentMinute: number): Advertisement => {
      // If no custom ad exists, always show default ad
      if (!customAd) {
        return DEFAULT_AD
      }

      // If custom ad exists, show default ad only at the 15-minute slot
      if (currentMinute === DEFAULT_AD_SLOT) {
        return DEFAULT_AD
      }

      // Otherwise show custom ad
      return customAd
    },
    [customAd],
  )

  const closeAd = useCallback(() => {
    setShowAd(false)
    setCurrentAd(null)
    setCountdown(0)
  }, [])

  useEffect(() => {
    const checkAdSchedule = () => {
      const now = new Date()
      const currentMinute = now.getMinutes()
      const currentSecond = now.getSeconds()

      // Show ad at the start of designated minutes (0-2 seconds)
      if (shouldShowAd(currentMinute) && currentSecond <= 2) {
        const adToShow = getAdForSlot(currentMinute)
        setCurrentAd(adToShow)
        setShowAd(true)

        // Set countdown for image ads (15 seconds)
        if (adToShow.fileType === "image") {
          setCountdown(15)
        }
      }
    }

    // Check every second
    const interval = setInterval(checkAdSchedule, 1000)
    return () => clearInterval(interval)
  }, [shouldShowAd, getAdForSlot])

  // Countdown timer for image ads
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && showAd && currentAd?.fileType === "image") {
      // Auto-close image ads after countdown
      closeAd()
    }
  }, [countdown, showAd, currentAd, closeAd])

  if (!showAd || !currentAd) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-black shadow-2xl">
        {/* Close button */}
        <Button
          onClick={closeAd}
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Countdown indicator for images */}
        {currentAd.fileType === "image" && countdown > 0 && (
          <div className="absolute left-2 top-2 z-10 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
            {countdown}s
          </div>
        )}

        {/* Ad content */}
        {currentAd.fileType === "video" ? (
          <video
            src={currentAd.filePath}
            autoPlay
            muted
            onEnded={closeAd}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        ) : (
          <img
            src={currentAd.filePath || "/placeholder.svg"}
            alt="Advertisement"
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        )}
      </div>
    </div>
  )
}
