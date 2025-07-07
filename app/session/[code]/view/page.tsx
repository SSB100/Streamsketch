"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import type { Drawing } from "@/lib/types"
import { Canvas, type CanvasHandle } from "@/components/whiteboard/canvas"
import { NukeAnimationOverlay } from "@/components/whiteboard/nuke-animation-overlay"
import { useRealtimeChannel } from "@/hooks/use-realtime-channel"
import { getSessionData } from "@/app/actions"
import { Copy, Eye, Maximize, Minimize } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

const POLLING_INTERVAL_MS = 5000 // Check for updates every 5 seconds

export default function ViewPage({ params }: { params: { code: string } }) {
  const [session, setSession] = useState<{ id: string } | null>(null)
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [nukeEvent, setNukeEvent] = useState<{ username: string | null; animationId: string } | null>(null)

  const canvasRef = useRef<CanvasHandle>(null)
  const fullscreenContainerRef = useRef<HTMLDivElement>(null)
  const lastRealtimeEventTimestamp = useRef<number>(0)

  const handleIncomingDrawBatch = useCallback(({ segments }: { segments: Drawing[] }) => {
    lastRealtimeEventTimestamp.current = Date.now()
    setDrawings((current) => [...current, ...segments])
  }, [])

  const handleIncomingNuke = useCallback(
    ({ username, animationId }: { username: string | null; animationId: string }) => {
      lastRealtimeEventTimestamp.current = Date.now()
      setDrawings([])
      setNukeEvent({ username, animationId })
    },
    [],
  )

  const channelOptions = useMemo(
    () => ({
      onDrawBatchBroadcast: handleIncomingDrawBatch,
      onNukeBroadcast: handleIncomingNuke,
    }),
    [handleIncomingDrawBatch, handleIncomingNuke],
  )

  useRealtimeChannel(session?.id ?? null, channelOptions)

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true)
      try {
        const { session: sessionData, drawings: initialDrawings } = await getSessionData(params.code)
        if (sessionData) {
          setSession(sessionData)
          setDrawings(initialDrawings)
        }
      } catch (error) {
        console.error("Failed to fetch session data:", error)
        toast.error("Failed to load session data")
      } finally {
        setIsLoading(false)
      }
    }
    fetchInitialData()
  }, [params.code])

  // Intelligent Polling for data synchronization
  useEffect(() => {
    if (!params.code) return

    const intervalId = setInterval(async () => {
      // If we received a real-time event recently, skip this poll.
      // This prevents overwriting a line that is actively being drawn.
      if (Date.now() - lastRealtimeEventTimestamp.current < POLLING_INTERVAL_MS) {
        console.log("[Polling] Skipped due to recent real-time activity.")
        return
      }

      console.log("[Polling] Canvas idle, refetching for synchronization...")
      try {
        const { drawings: dbDrawings } = await getSessionData(params.code)
        if (dbDrawings) {
          // The database is the source of truth. Replace local state when idle.
          setDrawings(dbDrawings)
        }
      } catch (error) {
        console.error("Polling failed:", error)
      }
    }, POLLING_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [params.code])

  const toggleFullscreen = () => {
    const elem = fullscreenContainerRef.current
    if (!elem) return

    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err) => {
        toast.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!")
  }

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-deep-space text-white">Loading...</div>
  }

  if (!session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-deep-space text-white">
        Session not found.
      </div>
    )
  }

  return (
    <main
      ref={fullscreenContainerRef}
      className="relative flex h-screen w-full flex-col items-center justify-center bg-deep-space p-4"
    >
      <NukeAnimationOverlay nukeEvent={nukeEvent} />
      <div className="relative w-full max-w-full h-full max-h-full aspect-[16/9]">
        <Canvas
          ref={canvasRef}
          width={1280}
          height={720}
          isDrawable={false}
          initialDrawings={drawings}
          onDraw={() => {}}
          onDrawStart={() => {}}
          onDrawEnd={() => {}}
          className="h-full w-full border-white/20"
        />
      </div>
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-white backdrop-blur-sm">
        <Eye className="h-5 w-5 text-green-400" />
        <span className="font-bold">STREAMER VIEW (READ-ONLY)</span>
      </div>
      <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-white backdrop-blur-sm">
        <span className="text-muted-foreground">Session Code:</span>
        <span className="font-mono text-lg font-bold text-neon-pink">{params.code}</span>
        <button onClick={() => copyToClipboard(params.code)} className="ml-1 transition-transform hover:scale-110">
          <Copy className="h-4 w-4" />
        </button>
      </div>
      <div className="absolute bottom-4 right-4">
        <Button onClick={toggleFullscreen} variant="outline" size="icon" className="bg-black/50">
          {isFullscreen ? <Minimize className="h-5 w-5 text-white" /> : <Maximize className="h-5 w-5 text-white" />}
        </Button>
      </div>
    </main>
  )
}
