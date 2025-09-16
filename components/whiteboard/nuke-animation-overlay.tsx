"use client"

import { useEffect, useRef, useState } from "react"
import type { NukeAnimation } from "@/lib/nuke-animations"

interface NukeAnimationOverlayProps {
  animation: NukeAnimation | null
  onComplete: () => void
}

export function NukeAnimationOverlay({ animation, onComplete }: NukeAnimationOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (animation && videoRef.current) {
      setIsVisible(true)
      const video = videoRef.current

      // Reset video to start
      video.currentTime = 0

      // Play the video
      video.play().catch(console.error)

      // Handle video end
      const handleVideoEnd = () => {
        setTimeout(() => {
          setIsVisible(false)
          setTimeout(onComplete, 500) // Allow fade out animation
        }, 500)
      }

      video.addEventListener("ended", handleVideoEnd)

      return () => {
        video.removeEventListener("ended", handleVideoEnd)
      }
    }
  }, [animation, onComplete])

  if (!animation || !isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-nuke-flash">
      <div className="relative w-full h-full animate-nuke-shake">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline preload="auto">
          <source src={animation.video} type="video/mp4" />
        </video>

        {/* Optional overlay effects */}
        <div className="absolute inset-0 bg-white/10 animate-pulse" />
      </div>
    </div>
  )
}
