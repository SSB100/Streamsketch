"use client"

import { useEffect, useState } from "react"
import { NUKE_ANIMATIONS } from "@/lib/nuke-animations"

interface NukeAnimationOverlayProps {
  nukeEvent: {
    username: string | null
    animationId: string
  } | null
}

export function NukeAnimationOverlay({ nukeEvent }: NukeAnimationOverlayProps) {
  const [isVisible, setIsVisible] = useState(false)

  // This effect triggers the animation's visibility when a new nuke event arrives.
  useEffect(() => {
    if (nukeEvent) {
      setIsVisible(true)
    }
  }, [nukeEvent])

  // This effect handles the timeout specifically for the default (non-video) animation.
  useEffect(() => {
    if (isVisible && nukeEvent?.animationId === "default") {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 4500) // The default flash animation is 4.5s long.
      return () => clearTimeout(timer)
    }
  }, [isVisible, nukeEvent])

  const handleVideoEnd = () => {
    setIsVisible(false)
  }

  if (!isVisible || !nukeEvent) {
    return null
  }

  const animation = NUKE_ANIMATIONS[nukeEvent.animationId] || NUKE_ANIMATIONS.default
  const displayName = nukeEvent.username || "A mysterious user"

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {animation.video && (
        <video
          src={animation.video}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnd} // Hide overlay when video finishes
          className="absolute h-full w-full object-cover"
        />
      )}

      <div className="relative z-10 animate-nuke-shake text-center">
        <h1 className="text-7xl font-extrabold text-white drop-shadow-[0_5px_10px_rgba(0,0,0,0.8)] md:text-9xl">
          NUKE
        </h1>
        <p className="text-2xl font-bold text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)] md:text-4xl">
          by {displayName}
        </p>
      </div>
    </div>
  )
}
