"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import type { Drawing, Advertisement } from "@/lib/types"
import { Canvas, type CanvasHandle } from "@/components/whiteboard/canvas"
import { NukeAnimationOverlay } from "@/components/whiteboard/nuke-animation-overlay"
import { AdOverlay } from "@/components/advertisements/ad-overlay"
import { useRealtimeChannel, type ConnectionStatus } from "@/hooks/use-realtime-channel"
import { getSessionData } from "@/app/actions"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/error-boundary"
import { ConnectionIndicator } from "./connection-indicator"

interface SessionViewProps {
  initialSession: { id: string; owner_wallet_address: string }
  initialDrawings: Drawing[]
  customAd: Advertisement | null
  sessionCode: string
}

function SessionViewContent({ initialSession, initialDrawings, customAd, sessionCode }: SessionViewProps) {
  const [drawings, setDrawings] = useState<Drawing[]>(initialDrawings)
  const [nukeEvent, setNukeEvent] = useState<{ username: string | null; animationId: string } | null>(null)

  const canvasRef = useRef<CanvasHandle>(null)
  const previousConnectionStatus = useRef<ConnectionStatus>("connected")

  const handleIncomingDraw = useCallback(({ drawing }: { drawing: Drawing }) => {
    setDrawings((prev) => {
      if (prev.some((d) => d.id === drawing.id)) {
        return prev
      }
      return [...prev, drawing]
    })
  }, [])

  const handleIncomingNuke = useCallback(
    ({ username, animationId }: { username: string | null; animationId: string }) => {
      setDrawings([])
      canvasRef.current?.clearCanvas()
      setNukeEvent({ username, animationId })
    },
    [],
  )

  const channelOptions = useMemo(
    () => ({
      onNukeBroadcast: handleIncomingNuke,
      onDrawBroadcast: handleIncomingDraw,
    }),
    [handleIncomingNuke, handleIncomingDraw],
  )
  const { connectionStatus } = useRealtimeChannel(initialSession?.id ?? null, channelOptions)

  const syncCanvasState = useCallback(async () => {
    if (!initialSession) return
    console.log("[Sync] Fetching latest canvas state...")
    try {
      const { drawings: serverDrawings } = await getSessionData(sessionCode)
      setDrawings(serverDrawings)
    } catch (err) {
      console.error("Failed to sync canvas state:", err)
      toast.error("Could not re-sync canvas state.")
    }
  }, [initialSession, sessionCode])

  useEffect(() => {
    if (previousConnectionStatus.current !== "connected" && connectionStatus === "connected") {
      console.log("[ViewPage] Reconnected. Syncing canvas state...")
      toast.info("Reconnected! Syncing data...")
      syncCanvasState()
    }
    previousConnectionStatus.current = connectionStatus
  }, [connectionStatus, syncCanvasState])

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-4">
      <NukeAnimationOverlay nukeEvent={nukeEvent} />
      <AdOverlay customAd={customAd} />
      <div className="absolute left-4 top-4 z-10 flex items-center gap-4">
        <div className="rounded-full bg-black/50 px-3 py-2">
          <ConnectionIndicator status={connectionStatus} />
        </div>
      </div>
      <div className="absolute right-4 top-4 z-10">
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Full Refresh
        </Button>
      </div>
      <div className="w-full h-full flex items-center justify-center">
        <Canvas ref={canvasRef} isDrawable={false} initialDrawings={drawings} className="border-2 border-white/20" />
      </div>
    </div>
  )
}

export default function SessionView(props: SessionViewProps) {
  return (
    <ErrorBoundary>
      <SessionViewContent {...props} />
    </ErrorBoundary>
  )
}
