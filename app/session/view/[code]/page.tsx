"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import type { Drawing } from "@/lib/types"
import { Canvas, type CanvasHandle } from "@/components/whiteboard/canvas"
import { NukeAnimationOverlay } from "@/components/whiteboard/nuke-animation-overlay"
import { useRealtimeChannel } from "@/hooks/use-realtime-channel"
import { getSessionData } from "@/app/actions"
import { Copy, Eye, Maximize, Minimize, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export default function ViewPage({ params }: { params: { code: string } }) {
  const [session, setSession] = useState<{ id: string } | null>(null)
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [nukeEvent, setNukeEvent] = useState<{ username: string | null; animationId: string } | null>(null)

  const canvasRef = useRef<CanvasHandle>(null)
  const fullscreenContainerRef = useRef<HTMLDivElement>(null)

  // --- Realtime Channel Handlers ---
  const handleIncomingDraw = useCallback(({ drawing }: { drawing: Drawing }) => {
    // Add the new drawing to our local state.
    // The Canvas component will automatically redraw from this state.
    setDrawings((prev) => [...prev, drawing])
  }, [])

  const handleIncomingNuke = useCallback(
    ({ username, animationId }: { username: string | null; animationId: string }) => {
      setDrawings([]) // Clear state
      canvasRef.current?.clearCanvas() // Clear canvas imperatively
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

  useRealtimeChannel(session?.id ?? null, channelOptions)

  // --- Manual Sync & Initial Load ---
  const refreshAllDrawings = useCallback(async () => {
    if (!session) return
    setIsLoading(true)
    try {
      const { drawings: serverDrawings } = await getSessionData(params.code)
      setDrawings(serverDrawings)
      toast.success("Canvas synced successfully!")
    } catch (err) {
      console.error("Failed to refresh drawings:", err)
      toast.error("Could not sync with the canvas.")
    } finally {
      setIsLoading(false)
    }
  }, [session, params.code])

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true)
      try {
        const { session: sessionData, drawings: initialDrawings } = await getSessionData(params.code)
        if (sessionData) {
          setSession(sessionData)
          setDrawings(initialDrawings)
        } else {
          toast.error("Session not found.")
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

  // --- Fullscreen Logic ---
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

  if (isLoading && drawings.length === 0) {
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
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-white backdrop-blur-sm">
        <Eye className="h-5 w-5 text-green-400" />
        <span className="font-bold">STREAMER VIEW (READ-ONLY)</span>
      </div>
      <div className="absolute right-4 top-4 flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={refreshAllDrawings} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Sync Canvas
        </Button>
        <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-white backdrop-blur-sm">
          <span className="text-muted-foreground">Session Code:</span>
          <span className="font-mono text-lg font-bold text-neon-pink">{params.code}</span>
          <button
            onClick={() => copyToClipboard(`https://streamsketch.tech/session/draw/${params.code}`)}
            className="ml-1 transition-transform hover:scale-110"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="relative w-full max-w-full h-full max-h-full aspect-[16/9]">
        <Canvas
          ref={canvasRef}
          width={1280}
          height={720}
          isDrawable={false}
          initialDrawings={drawings}
          onDrawStart={() => false}
          onDrawEnd={() => {}}
          className="h-full w-full border-white/20"
        />
      </div>
      <div className="absolute bottom-4 right-4">
        <Button onClick={toggleFullscreen} variant="outline" size="icon" className="bg-black/50">
          {isFullscreen ? <Minimize className="h-5 w-5 text-white" /> : <Maximize className="h-5 w-5 text-white" />}
        </Button>
      </div>
    </main>
  )
}
