"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import type { Drawing } from "@/lib/types"
import { Canvas, type CanvasHandle } from "@/components/whiteboard/canvas"
import { NukeAnimationOverlay } from "@/components/whiteboard/nuke-animation-overlay"
import { useRealtimeChannel } from "@/hooks/use-realtime-channel"
import { getSessionData } from "@/app/actions"
import { ErrorBoundary } from "@/components/error-boundary"

function ViewPageContent({ params }: { params: { code: string } }) {
  const [session, setSession] = useState<{ id: string; owner_wallet_address: string; is_free?: boolean } | null>(null)
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [nukeEvent, setNukeEvent] = useState<{ username: string | null; animationId: string } | null>(null)

  const canvasRef = useRef<CanvasHandle>(null)
  const lastNukeTimestampRef = useRef<number>(0)

  const handleIncomingDraw = useCallback(({ drawing }: { drawing: Drawing }) => {
    setDrawings((prev) => {
      if (prev.some((d) => d.id === drawing.id)) {
        return prev
      }
      return [...prev, drawing]
    })
  }, [])

  const handleIncomingNuke = useCallback(
    ({
      username,
      animationId,
      nukeTimestamp,
    }: {
      username: string | null
      animationId: string
      nukeTimestamp: number
    }) => {
      lastNukeTimestampRef.current = nukeTimestamp
      setDrawings([])
      canvasRef.current?.clearCanvas()
      setNukeEvent({ username, animationId })
    },
    [],
  )

  useRealtimeChannel(session?.id ?? null, {
    onNukeBroadcast: handleIncomingNuke,
    onDrawBroadcast: handleIncomingDraw,
  })

  useEffect(() => {
    const bootstrap = async () => {
      setIsLoading(true)
      try {
        const { session: s, drawings: d } = await getSessionData(params.code)
        if (!s) {
          console.error("Session not found")
          setIsLoading(false)
          return
        }
        setSession(s as { id: string; owner_wallet_address: string; is_free?: boolean })
        setDrawings(d)
      } catch (err) {
        console.error("Bootstrap failed:", err)
      } finally {
        setIsLoading(false)
      }
    }
    bootstrap()
  }, [params.code])

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-deep-space text-white">Loading…</div>
  }
  if (!session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-deep-space text-white">
        Session not found.
      </div>
    )
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-deep-space gap-4 p-4">
      <NukeAnimationOverlay nukeEvent={nukeEvent} />

      {/* Simple instruction text */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <p className="text-white text-lg font-medium">
          Want to draw on this board? Visit streamsketch.tech and enter code:
          <span className="ml-2 font-bold text-neon-cyan">{params.code}</span>
        </p>
      </div>

      <Canvas
        ref={canvasRef}
        width={1280}
        height={720}
        isDrawable={false}
        initialDrawings={drawings}
        onDrawStart={() => false}
        onDrawEnd={() => {}}
        color="#FFFFFF"
        lineWidth={5}
      />
    </main>
  )
}

export default function ViewPage({ params }: { params: { code: string } }) {
  return (
    <ErrorBoundary>
      <ViewPageContent params={params} />
    </ErrorBoundary>
  )
}
