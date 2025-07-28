"use client"

import { useState, useEffect } from "react"
import type { Advertisement } from "@/lib/types"

interface AdOverlayProps {
  customAd: Advertisement | null
}

export function AdOverlay({ customAd }: AdOverlayProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentAd, setCurrentAd] = useState<Advertisement | null>(null)

  useEffect(() => {
    const scheduleAds = () => {
      const now = new Date()
      const currentMinute = now.getMinutes()
      const currentSecond = now.getSeconds()

      // Calculate milliseconds until next ad time (0, 15, 30, 45 minutes)
      const adMinutes = [0, 15, 30, 45]
      const nextAdMinute = adMinutes.find((minute) => minute > currentMinute) || 60 + adMinutes[0]
      const minutesUntilNext = nextAdMinute > 60 ? nextAdMinute - 60 : nextAdMinute - currentMinute
      const millisecondsUntilNext = (minutesUntilNext * 60 - currentSecond) * 1000

      const showAd = () => {
        const now = new Date()
        const minute = now.getMinutes()

        // Determine which ad to show based on minute and availability
        let adToShow: Advertisement | null = null

        if (customAd) {
          // If custom ad exists: show default at 15min, custom at 0,30,45min
          if (minute === 15) {
            adToShow = {
              filePath: "/ads/default-ad.png",
              fileType: "image",
              fileName: "default-ad.png",
            }
          } else if ([0, 30, 45].includes(minute)) {
            adToShow = customAd
          }
        } else {
          // If no custom ad: show default at all times (0,15,30,45)
          if ([0, 15, 30, 45].includes(minute)) {
            adToShow = {
              filePath: "/ads/default-ad.png",
              fileType: "image",
              fileName: "default-ad.png",
            }
          }
        }

        if (adToShow) {
          setCurrentAd(adToShow)
          setIsVisible(true)

          // Hide ad after appropriate duration
          const duration = adToShow.fileType === "mp4" ? 15000 : 10000 // 15s for video, 10s for images/gifs
          setTimeout(() => {
            setIsVisible(false)
            setCurrentAd(null)
          }, duration)
        }
      }

      // Schedule the next ad
      const timeoutId = setTimeout(() => {
        showAd()
        // Set up recurring schedule every 15 minutes
        const intervalId = setInterval(showAd, 15 * 60 * 1000)

        // Cleanup interval when component unmounts
        return () => clearInterval(intervalId)
      }, millisecondsUntilNext)

      // Cleanup timeout when component unmounts
      return () => clearTimeout(timeoutId)
    }

    const cleanup = scheduleAds()
    return cleanup
  }, [customAd])

  if (!isVisible || !currentAd) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-4xl max-h-[80vh] rounded-lg overflow-hidden shadow-2xl">
        {currentAd.fileType === "mp4" ? (
          <video
            src={currentAd.filePath}
            autoPlay
            muted
            className="w-full h-full object-contain"
            onError={(e) => {
              console.error("Video failed to load:", e)
              setIsVisible(false)
              setCurrentAd(null)
            }}
          />
        ) : (
          <img
            src={currentAd.filePath || "/placeholder.svg"}
            alt="Advertisement"
            className="w-full h-full object-contain"
            onError={(e) => {
              console.error("Image failed to load:", e)
              setIsVisible(false)
              setCurrentAd(null)
            }}
          />
        )}
      </div>
    </div>
  )
}
