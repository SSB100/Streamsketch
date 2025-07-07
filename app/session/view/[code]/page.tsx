"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import type { Drawing } from "@/lib/types"
import { Canvas, type CanvasHandle } from "@/components/whiteboard/canvas"
import { NukeAnimationOverlay } from "@/components/whiteboard/nuke-animation-overlay"
import { useRealtimeChannel } from "@/hooks/use-realtime-channel"
import { getSessionData, getNewDrawings } from "@/app/actions"
import { Copy, Eye, Maximize, Minimize } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

const POLLING_INTERVAL_MS = 5000 // Check for updates every 5 seconds

export default function ViewPage({ params }: { params: { code: string } }) {
  const [session, setSession] = useState<{ id: string } | null>(null)
  const [initialDrawings, setInitialDrawings] = useState<Drawing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [nukeEvent, setNukeEvent] = useState<{ username: string | null; animationId: string } | null>(null)

  const canvasRef = useRef<CanvasHandle>(null)
  const fullscreenContainerRef = useRef<HTMLDivElement>(null)
  const lastDrawingIdRef = useRef<number>(0)
  const lastRealtimeEventTimestamp = useRef<number>(Date.now())

  const handleIncomingDrawBatch = useCallback(({ segments }: { segments: Drawing[] }) => {
    lastRealtimeEventTimestamp.current = Date.now()
    if (segments.length > 0) {
      canvasRef.current?.drawBatchFromBroadcast(segments)
      const maxId = Math.max(...segments.map((s) => s.id))
      if (maxId > lastDrawingIdRef.current) {
        lastDrawingIdRef.current = maxId
      }
    }
  }, [])

  const handleIncomingNuke = useCallback(
    ({ username, animationId }: { username: string | null; animationId: string }) => {
      lastRealtimeEventTimestamp.current = Date.now()
      canvasRef.current?.clearCanvas()
      lastDrawingIdRef.current = 0 // Reset on nuke
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
        const { session: sessionData, drawings } = await getSessionData(params.code)
        if (sessionData) {
          setSession(sessionData)
          setInitialDrawings(drawings)
          if (drawings.length > 0) {
            lastDrawingIdRef.current = Math.max(...drawings.map((d) => d.id))
          }
        } else {
          toast.error("Session not found.")
        }
      } catch (error) {
        console.error("Failed to fetch session data:", error)
        toast.error("Failed to load session data.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchInitialData()
  }, [params.code])

  // Fallback polling for data synchronization
  useEffect(() => {
    if (!session?.id) return

    const intervalId = setInterval(async () => {
      if (Date.now() - lastRealtimeEventTimestamp.current < POLLING_INTERVAL_MS * 2) {
        return
      }

      console.log("[Polling] Checking for missed drawings...")
      try {
        const newDrawings = await getNewDrawings(session.id, lastDrawingIdRef.current)
        if (newDrawings.length > 0) {
          toast.info(`Synced ${newDrawings.length} missed drawings.`)
          canvasRef.current?.drawBatchFromBroadcast(newDrawings)
          lastDrawingIdRef.current = Math.max(...newDrawings.map((d) => d.id))
        }
      } catch (error) {
        console.error("Polling failed:", error)
      }
    }, POLLING_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [session?.id])

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
          initialDrawings={initialDrawings}
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
      <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
        <div className="rounded-full bg-black/50 px-4 py-2 text-white backdrop-blur-sm">
          <span className="text-sm text-muted-foreground">
            Visit StreamSketch.tech and enter session code to draw here
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-white backdrop-blur-sm">
          <span className="text-muted-foreground">Session Code:</span>
          <span className="font-mono text-lg font-bold text-neon-pink">{params.code}</span>
          <button
            onClick={() => copyToClipboard(`${window.location.origin}/session/draw/${params.code}`)}
            className="ml-1 transition-transform hover:scale-110"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="absolute bottom-4 right-4">
        <Button onClick={toggleFullscreen} variant="outline" size="icon" className="bg-black/50">
          {isFullscreen ? <Minimize className="h-5 w-5 text-white" /> : <Maximize className="h-5 w-5 text-white" />}
        </Button>
      </div>
    </main>
  )
}
