"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { SystemProgram, Transaction, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js"
import type { Drawing } from "@/lib/types"
import { Canvas, type CanvasHandle } from "@/components/whiteboard/canvas"
import { ColorPicker } from "@/components/whiteboard/color-picker"
import { BrushSizePicker } from "@/components/whiteboard/brush-size-picker"
import { PurchaseCredits } from "@/components/dashboard/purchase-credits"
import { NukeSelectionDialog } from "@/components/whiteboard/nuke-selection-dialog"
import { NukeAnimationOverlay } from "@/components/whiteboard/nuke-animation-overlay"
import { useRealtimeChannel, type ConnectionStatus } from "@/hooks/use-realtime-channel"
import {
  getSessionData,
  getUserData,
  getFreeCreditsForSession,
  recordDrawingAction,
  initiateNukeAction,
} from "@/app/actions"
import { Rocket, Edit, Bomb, RefreshCw, Wifi, WifiOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { NukeAnimation } from "@/lib/nuke-animations"
import { APP_WALLET_ADDRESS } from "@/lib/constants"
import { ErrorBoundary } from "@/components/error-boundary"

function DrawPageContent({ params }: { params: { code: string } }) {
  const { publicKey, sendTransaction, wallet } = useWallet()

  const [session, setSession] = useState<{ id: string; owner_wallet_address: string } | null>(null)
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [credits, setCredits] = useState({
    paidLines: 0,
    freeLines: 0,
    freeNukes: 0,
    username: null as string | null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isNukeDialogOpen, setIsNukeDialogOpen] = useState(false)
  const [nukeEvent, setNukeEvent] = useState<{ username: string | null; animationId: string } | null>(null)
  const [color, setColor] = useState("#FFFFFF")
  const [brushSize, setBrushSize] = useState(5)

  const canvasRef = useRef<CanvasHandle>(null)
  const lastNukeTimestampRef = useRef<number>(0)
  const drawStartTimeRef = useRef<number>(0)
  const lineDrawTimerRef = useRef<NodeJS.Timeout | null>(null)
  const previousConnectionStatus = useRef<ConnectionStatus>("connected")

  const pendingDrawingsRef = useRef<
    Map<
      number,
      {
        drawing: Drawing
        promise: Promise<{ success: boolean; error?: string }>
        retryCount: number
      }
    >
  >(new Map())
  const nextTempIdRef = useRef(1)

  const handleIncomingDraw = useCallback(({ drawing }: { drawing: Drawing }) => {
    const tempId = Array.from(pendingDrawingsRef.current.entries()).find(
      ([_, pending]) =>
        pending.drawing.drawer_wallet_address === drawing.drawer_wallet_address &&
        JSON.stringify(pending.drawing.drawing_data) === JSON.stringify(drawing.drawing_data),
    )?.[0]

    if (tempId) {
      canvasRef.current?.confirmOptimisticDrawing(tempId, drawing)
      pendingDrawingsRef.current.delete(tempId)
    } else {
      setDrawings((prev) => {
        if (prev.some((d) => d.id === drawing.id)) {
          return prev
        }
        return [...prev, drawing]
      })
    }
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
      pendingDrawingsRef.current.clear()
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

  const refreshUserData = useCallback(async () => {
    if (!publicKey || !session) return
    try {
      const [paidData, freeData] = await Promise.all([
        getUserData(publicKey.toBase58()),
        getFreeCreditsForSession(publicKey.toBase58(), session.id),
      ])
      setCredits({
        paidLines: paidData.lineCredits,
        username: paidData.username,
        freeLines: freeData.freeLines,
        freeNukes: freeData.freeNukes,
      })
    } catch (err) {
      console.error("Failed to refresh user data:", err)
      toast.error("Could not refresh your credit balance.")
    }
  }, [publicKey, session])

  const syncCanvasState = useCallback(async () => {
    if (!session) return
    console.log("[Sync] Fetching latest canvas state...")
    try {
      const { drawings: serverDrawings } = await getSessionData(params.code)
      setDrawings(serverDrawings)
      if (pendingDrawingsRef.current.size > 0) {
        pendingDrawingsRef.current.clear()
        toast.info("Cleared pending drawings after re-sync.")
      }
    } catch (err) {
      console.error("Failed to sync canvas state:", err)
      toast.error("Could not re-sync canvas state.")
    }
  }, [session, params.code])

  useEffect(() => {
    const bootstrap = async () => {
      setIsLoading(true)
      try {
        const { session: s, drawings: d } = await getSessionData(params.code)
        if (!s) {
          toast.error("Session not found.")
          setIsLoading(false)
          return
        }
        setSession(s as { id: string; owner_wallet_address: string })
        setDrawings(d)
      } catch (err) {
        console.error("Bootstrap failed:", err)
        toast.error("Failed to load session data.")
      } finally {
        setIsLoading(false)
      }
    }
    bootstrap()
  }, [params.code])

  useEffect(() => {
    if (session && publicKey) {
      refreshUserData()
    }
  }, [session, publicKey, refreshUserData])

  useEffect(() => {
    if (previousConnectionStatus.current !== "connected" && connectionStatus === "connected") {
      console.log("[DrawPage] Reconnected. Syncing canvas and user data...")
      toast.info("Reconnected! Syncing data...")
      refreshUserData()
      syncCanvasState()
    }
    previousConnectionStatus.current = connectionStatus
  }, [connectionStatus, refreshUserData, syncCanvasState])

  const handleDrawStart = () => {
    if (!publicKey) {
      toast.error("Please connect your wallet to draw.")
      return false
    }
    if (credits.paidLines + credits.freeLines < 1) {
      toast.error("You are out of line credits!")
      return false
    }
    drawStartTimeRef.current = Date.now()

    if (lineDrawTimerRef.current) {
      clearTimeout(lineDrawTimerRef.current)
    }

    lineDrawTimerRef.current = setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.forceStopDrawing()
        lineDrawTimerRef.current = null
      }
    }, 5000)

    return true
  }

  const retryFailedDrawing = useCallback(
    async (tempId: number) => {
      const pending = pendingDrawingsRef.current.get(tempId)
      if (!pending || !session || !publicKey) return

      if (pending.retryCount >= 3) {
        canvasRef.current?.removeOptimisticDrawing(tempId)
        pendingDrawingsRef.current.delete(tempId)
        toast.error("Failed to save drawing after multiple attempts. Please check your connection.")
        await refreshUserData()
        return
      }

      const retryPromise = recordDrawingAction(publicKey.toBase58(), session.id, pending.drawing.drawing_data)

      pendingDrawingsRef.current.set(tempId, {
        ...pending,
        promise: retryPromise,
        retryCount: pending.retryCount + 1,
      })

      try {
        const result = await retryPromise
        if (!result.success) {
          setTimeout(() => retryFailedDrawing(tempId), 2000 * pending.retryCount)
        }
      } catch (err) {
        setTimeout(() => retryFailedDrawing(tempId), 2000 * pending.retryCount)
      }
    },
    [session, publicKey, refreshUserData],
  )

  const handleDrawEnd = async (line: Omit<Drawing["drawing_data"], "drawer_wallet_address">) => {
    if (lineDrawTimerRef.current) {
      clearTimeout(lineDrawTimerRef.current)
      lineDrawTimerRef.current = null
    }

    if (!publicKey || !session) return

    if (drawStartTimeRef.current < lastNukeTimestampRef.current) {
      toast.info("The board was cleared while you were drawing. Your line was not saved.")
      return
    }

    if (!line.points || line.points.length < 2) {
      return
    }

    const tempId = nextTempIdRef.current++
    const optimisticDrawing: Drawing = {
      id: tempId,
      drawer_wallet_address: publicKey.toBase58(),
      drawing_data: line,
      created_at: new Date().toISOString(),
    }

    canvasRef.current?.addOptimisticDrawing(optimisticDrawing)
    setCredits((p) => (p.freeLines > 0 ? { ...p, freeLines: p.freeLines - 1 } : { ...p, paidLines: p.paidLines - 1 }))

    const serverPromise = recordDrawingAction(publicKey.toBase58(), session.id, line)

    pendingDrawingsRef.current.set(tempId, {
      drawing: optimisticDrawing,
      promise: serverPromise,
      retryCount: 0,
    })

    try {
      const result = await serverPromise
      if (!result.success) {
        console.warn("Drawing rejected by server, starting retry:", result.error)
        setTimeout(() => retryFailedDrawing(tempId), 1000)
      }
    } catch (error) {
      console.error("Drawing request failed:", error)
      setTimeout(() => retryFailedDrawing(tempId), 1000)
    }
  }

  const handleNuke = async (animation: NukeAnimation) => {
    if (!publicKey || !wallet || !sendTransaction || !session) {
      toast.error("Wallet not fully connected or session invalid.")
      return
    }

    let result: { success: boolean; error?: string }
    let signature: string | undefined = undefined

    try {
      if (animation.id !== "free_nuke") {
        const rpcHost = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST
        if (!rpcHost) {
          throw new Error("Solana RPC host is not configured.")
        }
        const connection = new Connection(rpcHost, "confirmed")

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed")
        const transaction = new Transaction({ feePayer: publicKey, blockhash, lastValidBlockHeight }).add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: APP_WALLET_ADDRESS,
            lamports: animation.price * LAMPORTS_PER_SOL,
          }),
        )
        signature = await sendTransaction(transaction, connection)
        toast.info("Transaction sent! Awaiting confirmation...")
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed")
        toast.success("Payment confirmed! Nuking the board...")
      }

      result = await initiateNukeAction(publicKey.toBase58(), session.id, animation, signature)

      if (result.success) {
        setIsNukeDialogOpen(false)
        await refreshUserData()
      } else {
        toast.error("Failed to trigger nuke.", { description: result.error })
      }
    } catch (error: any) {
      console.error("Nuke failed", error)
      toast.error("Nuke failed", { description: error.message, duration: 6000 })
    }
  }

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

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-deep-space gap-4 p-4">
      <NukeAnimationOverlay nukeEvent={nukeEvent} />
      <div className="absolute left-4 top-4 flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-white">
          <Edit className="h-5 w-5 text-neon-pink" />
          <span className="font-bold">DRAWING MODE</span>
        </div>
        <div className="rounded-full bg-black/50 px-3 py-2">
          <ConnectionIndicator />
        </div>
      </div>
      <div className="absolute right-4 top-4">
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Full Refresh
        </Button>
      </div>
      <Canvas
        ref={canvasRef}
        width={1280}
        height={720}
        isDrawable={!!publicKey}
        initialDrawings={drawings}
        onDrawStart={handleDrawStart}
        onDrawEnd={handleDrawEnd}
        color={color}
        lineWidth={brushSize}
      />
      <div className="flex w-full max-w-[1280px] items-center justify-between rounded-lg bg-deep-space/50 p-2">
        <div className="flex items-center gap-4">
          <ColorPicker selectedColor={color} onColorChange={setColor} />
          <BrushSizePicker size={brushSize} onSizeChange={setBrushSize} />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-gray-800 px-4 py-2 text-white">
            <Rocket className="h-5 w-5 text-neon-pink" />
            <span className="font-bold">{credits.paidLines + credits.freeLines}</span>
            {credits.freeLines > 0 && <span className="text-xs text-green-400">({credits.freeLines} free)</span>}
          </div>
          <Button
            variant="destructive"
            className="bg-neon-cyan text-white hover:bg-neon-cyan/90"
            onClick={() => setIsNukeDialogOpen(true)}
            disabled={!publicKey}
          >
            <Bomb className="mr-2 h-4 w-4" />
            Nuke Board
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-neon-pink text-white hover:bg-neon-pink/90" disabled={!publicKey}>
                Buy Lines
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl border-border/40 bg-deep-space">
              <DialogHeader>
                <DialogTitle>Purchase Line Credits</DialogTitle>
                <DialogDescription>
                  Purchase line credits using SOL to continue interacting with the board.
                </DialogDescription>
              </DialogHeader>
              <PurchaseCredits onPurchaseSuccess={refreshUserData} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <NukeSelectionDialog
        isOpen={isNukeDialogOpen}
        onOpenChange={setIsNukeDialogOpen}
        onNuke={handleNuke}
        freeNukeCount={credits.freeNukes}
      />
    </main>
  )
}

export default function DrawPage({ params }: { params: { code: string } }) {
  return (
    <ErrorBoundary>
      <DrawPageContent params={params} />
    </ErrorBoundary>
  )
}
