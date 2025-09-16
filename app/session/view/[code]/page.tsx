"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import type { Drawing } from "@/lib/types"
import { Canvas, type CanvasHandle } from "@/components/whiteboard/canvas"
import { NukeAnimationOverlay } from "@/components/whiteboard/nuke-animation-overlay"
import { useRealtimeChannel, type ConnectionStatus } from "@/hooks/use-realtime-channel"
import { getSessionData } from "@/app/actions"
import { Maximize, Minimize, RefreshCw, Loader2, Wifi, WifiOff } from "lucide-react"
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
  const lastNukeTimestampRef = useRef<number>(0)
  const previousConnectionStatus = useRef<ConnectionStatus>("connected")

  const drawUrl = `https://streamsketch.tech/session/draw/${params.code}`

  // --- Realtime Channel Handlers ---
  const handleIncomingDraw = useCallback(({ drawing }: { drawing: Drawing }) => {
    if (new Date(drawing.created_at).getTime() < lastNukeTimestampRef.current) {
      return
    }
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

  const channelOptions = useMemo(
    () => ({
      onNukeBroadcast: handleIncomingNuke,
      onDrawBroadcast: handleIncomingDraw,
    }),
    [handleIncomingNuke, handleIncomingDraw],
  )

  const { connectionStatus } = useRealtimeChannel(session?.id ?? null, channelOptions)

  // --- Manual Sync & Initial Load ---
  const refreshAllDrawings = useCallback(async () => {
    if (!session) return
    setIsLoading(true)
    try {
      const { drawings: serverDrawings } = await getSessionData(params.code)
      setDrawings([]) // Clear local state
      setDrawings(serverDrawings) // Populate with fresh server state
      toast.success("Canvas synced successfully!")
    } catch (err) {
      console.error("Failed to refresh drawings:", err)
      toast.error("Could not sync with the canvas.")
    } finally {
      setIsLoading(false)
    }
  }, [session, params.code])

  // Effect to handle initial data load
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

  // Effect to handle re-syncing after a reconnection
  useEffect(() => {
    if (previousConnectionStatus.current !== "connected" && connectionStatus === "connected") {
      console.log("[ViewPage] Reconnected. Syncing canvas state...")
      toast.info("Reconnected! Syncing canvas...")
      refreshAllDrawings()
    }
    previousConnectionStatus.current = connectionStatus
  }, [connectionStatus, refreshAllDrawings])

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

  const ConnectionIndicator = () => {
    const getStatusColor = () => {
      switch (connectionStatus) {
        case "connected":
          return "text-green-400"
        case "disconnected":
          return "text-red-400"
        case "reconnecting":
          return "text-yellow-400"
        default:
          return "text-gray-400"
      }
    }
    const getStatusIcon = () => {
      switch (connectionStatus) {
        case "connected":
          return <Wifi className="h-4 w-4" />
        case "disconnected":
          return <WifiOff className="h-4 w-4" />
        case "reconnecting":
          return <RefreshCw className="h-4 w-4 animate-spin" />
        default:
          return <Wifi className="h-4 w-4" />
      }
    }
    return (
      <div className={`flex items-center gap-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-xs font-medium capitalize">{connectionStatus}</span>
      </div>
    )
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
      <div className="z-50">
        <NukeAnimationOverlay nukeEvent={nukeEvent} />
      </div>

      {/* Top Center UI - JOIN INSTRUCTIONS */}
      <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2 text-white">
        <div className="text-lg font-bold text-center">
          <span className="text-gray-300">Want to draw on this board? Visit </span>
          <span className="text-neon-pink">streamsketch.tech</span>
          <span className="text-gray-300"> and enter code: </span>
          <span className="text-xl font-mono font-black text-neon-cyan">{params.code}</span>
        </div>
      </div>

      {/* Top Right UI */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={refreshAllDrawings} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Sync Canvas
        </Button>
      </div>

      {/* Main Canvas */}
      <div className="relative z-10 w-full max-w-full h-full max-h-full aspect-[16/9]">
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

      {/* Bottom Left UI */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="rounded-full bg-black/50 px-3 py-2 backdrop-blur-sm">
          <ConnectionIndicator />
        </div>
      </div>

      {/* Bottom Right UI */}
      <div className="absolute bottom-4 right-4 z-20">
        <Button onClick={toggleFullscreen} variant="outline" size="icon" className="bg-black/50">
          {isFullscreen ? <Minimize className="h-5 w-5 text-white" /> : <Maximize className="h-5 w-5 text-white" />}
        </Button>
      </div>
    </main>
  )
}
