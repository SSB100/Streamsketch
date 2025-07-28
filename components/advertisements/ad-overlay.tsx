"use client"

import { useState, useEffect, useRef } from "react"

const VIDEO_AD_DURATION_MS = 15000 // 15 seconds
const IMAGE_AD_DURATION_MS = 10000 // 10 seconds
const DEFAULT_AD_PATH = "/ads/default-ad.mp4"

type AdData = {
  filePath: string
  fileType: "mp4" | "gif" | "image"
} | null

interface AdOverlayProps {
  customAd: AdData
}

export function AdOverlay({ customAd }: AdOverlayProps) {
  const [isAdPlaying, setIsAdPlaying] = useState(false)
  const [currentAd, setCurrentAd] = useState<{ src: string; type: "mp4" | "gif" | "image" } | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const scheduleNextAd = () => {
      const now = new Date()
      const minutes = now.getMinutes()
      const seconds = now.getSeconds()

      let nextAdMinute: number
      let adToPlay: { src: string; type: "mp4" | "gif" | "image" }

      // Determine which ad to play and when
      if (customAd && [0, 20, 40].includes(minutes)) {
        nextAdMinute = minutes
        adToPlay = { src: customAd.filePath, type: customAd.fileType }
      } else if ([15, 30, 45].includes(minutes)) {
        nextAdMinute = minutes
        adToPlay = { src: DEFAULT_AD_PATH, type: "mp4" }
      } else {
        // Find the next scheduled ad time
        const intervals = customAd ? [0, 15, 20, 30, 40, 45] : [0, 15, 30, 45]
        const nextInterval = intervals.find((interval) => interval > minutes) ?? intervals[0] + 60
        const minutesUntilNextAd = nextInterval - minutes
        const delay = (minutesUntilNextAd * 60 - seconds) * 1000

        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(scheduleNextAd, delay > 0 ? delay : 1000)
        return
      }

      // Check if we are in the first second of the target minute to avoid re-triggering
      if (seconds > 1) {
        // Reschedule for the next interval
        const intervals = customAd ? [0, 15, 20, 30, 40, 45] : [0, 15, 30, 45]
        const currentIntervalIndex = intervals.indexOf(nextAdMinute)
        const nextInterval = intervals[currentIntervalIndex + 1] ?? intervals[0] + 60
        const minutesUntilNextAd = nextInterval - minutes
        const delay = (minutesUntilNextAd * 60 - seconds) * 1000

        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(scheduleNextAd, delay > 0 ? delay : 1000)
        return
      }

      // Play the ad
      setCurrentAd(adToPlay)
      setIsAdPlaying(true)

      const adDuration = adToPlay.type === "image" ? IMAGE_AD_DURATION_MS : VIDEO_AD_DURATION_MS

      // Hide the ad after its duration
      setTimeout(() => {
        setIsAdPlaying(false)
        setCurrentAd(null)
        // Schedule the next ad check after the current one finishes + a small buffer
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(scheduleNextAd, 60 * 1000) // Check again in 1 minute
      }, adDuration)
    }

    scheduleNextAd()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [customAd])

  if (!isAdPlaying || !currentAd) {
    return null
  }

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full h-full max-w-[80vw] max-h-[80vh] flex items-center justify-center">
        {currentAd.type === "mp4" ? (
          <video
            src={currentAd.src}
            autoPlay
            muted
            playsInline
            className="max-w-full max-h-full object-contain"
            onEnded={() => setIsAdPlaying(false)}
          />
        ) : (
          <img
            src={currentAd.src || "/placeholder.svg"}
            alt="Advertisement"
            className="max-w-full max-h-full object-contain"
          />
        )}
      </div>
    </div>
  )
}
