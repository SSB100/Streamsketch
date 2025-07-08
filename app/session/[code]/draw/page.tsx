"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js"
import type { Drawing } from "@/lib/types"
import { Canvas, type CanvasHandle } from "@/components/whiteboard/canvas"
import { ColorPicker } from "@/components/whiteboard/color-picker"
import { BrushSizePicker } from "@/components/whiteboard/brush-size-picker"
import { PurchaseCredits } from "@/components/dashboard/purchase-credits"
import { NukeSelectionDialog } from "@/components/whiteboard/nuke-selection-dialog"
import { NukeAnimationOverlay } from "@/components/whiteboard/nuke-animation-overlay"
import { useRealtimeChannel } from "@/hooks/use-realtime-channel"
import {
  getSessionData,
  getUserData,
  processNukePurchase,
  getFreeCreditsForSession,
  spendCreditsAndDrawStrokesBatchAction, // Import the new BATCH action
} from "@/app/actions"
import { Rocket, Edit, Bomb } from "lucide-react"
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
import { useFreeNukeAction } from "@/hooks/use-free-nuke-action"
import { ErrorBoundary } from "@/components/error-boundary"

type DrawingSegment = Omit<Drawing, "id">

const BROADCAST_INTERVAL_MS = 200
const DRAWING_TIME_LIMIT_MS = 5000
const BATCH_SAVE_INTERVAL_MS = 1500 // Send data to server every 1.5 seconds

function DrawPageContent({ params }: { params: { code: string } }) {
  const { publicKey, sendTransaction, wallet } = useWallet()
  const { connection } = useConnection()
  const freeNukeAction = useFreeNukeAction()

  const [session, setSession] = useState<{ id: string; owner_wallet_address: string } | null>(null)
  const [initialDrawings, setInitialDrawings] = useState<Drawing[]>([])
  const [credits, setCredits] = useState({
    paidLines: 0,
    freeLines: 0,
    freeNukes: 0,
    username: null as string | null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isNukeDialogOpen, setIsNukeDialogOpen] = useState(false)
  const [nukeEvent, setNukeEvent] = useState<{ username: string | null; animationId: string; eventKey: number } | null>(
    null,
  )
  const [color, setColor] = useState("#FFFFFF")
  const [brushSize, setBrushSize] = useState(5)

  const canvasRef = useRef<CanvasHandle>(null)
  const broadcastBufferRef = useRef<DrawingSegment[]>([])
  const currentStrokeRef = useRef<DrawingSegment[]>([])
  const strokesToSaveBufferRef = useRef<DrawingSegment[][]>([])
  const broadcastIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const drawingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const batchSaveIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const handleIncomingDrawBatch = useCallback(
    ({ segments }: { segments: Drawing[] }) => {
      if (segments[0]?.drawer_wallet_address !== publicKey?.toBase58()) {
        segments.forEach((drawing) => canvasRef.current?.drawFromBroadcast(drawing))
      }
    },
    [publicKey],
  )

  const handleIncomingNuke = useCallback(
    ({ username, animationId }: { username: string | null; animationId: string }) => {
      canvasRef.current?.clearCanvas()
      setNukeEvent({ username, animationId, eventKey: Date.now() })
    },
    [],
  )

  const channelOptions = useMemo(
    () => ({ onDrawBatchBroadcast: handleIncomingDrawBatch, onNukeBroadcast: handleIncomingNuke }),
    [handleIncomingDrawBatch, handleIncomingNuke],
  )
  const channel = useRealtimeChannel(session?.id ?? null, channelOptions)

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
    }
  }, [publicKey, session])

  const resetCanvasToTruth = useCallback(async () => {
    try {
      const { drawings: serverDrawings } = await getSessionData(params.code)
      setInitialDrawings(serverDrawings)
    } catch (err) {
      console.error("Failed to reset canvas to server state:", err)
      toast.error("Could not sync with the server. Please refresh.")
    }
  }, [params.code])

  const sendStrokesToServer = useCallback(async () => {
    if (strokesToSaveBufferRef.current.length === 0 || !publicKey || !session) {
      return
    }

    const strokesBatch = [...strokesToSaveBufferRef.current]
    strokesToSaveBufferRef.current = []

    const res = await spendCreditsAndDrawStrokesBatchAction(publicKey.toBase58(), session.id, strokesBatch)

    if (res.success) {
      await refreshUserData()
    } else {
      toast.error("Your drawing failed to save.", { description: res.error || "Please try again." })
      await resetCanvasToTruth()
      await refreshUserData()
    }
  }, [publicKey, session, refreshUserData, resetCanvasToTruth])

  useEffect(() => {
    async function bootstrap() {
      setIsLoading(true)
      try {
        const { session: s, drawings: d } = await getSessionData(params.code)
        if (!s) {
          toast.error("Session not found.")
          setIsLoading(false)
          return
        }
        setSession(s as { id: string; owner_wallet_address: string })
        setInitialDrawings(d)
        if (publicKey) {
          await refreshUserData()
        }
      } catch (err) {
        console.error("Bootstrap failed:", err)
        toast.error("Failed to load session data")
      } finally {
        setIsLoading(false)
      }
    }
    bootstrap()

    const keepAliveInterval = setInterval(() => {
      if (publicKey && session) {
        refreshUserData()
      }
    }, 10000)

    return () => clearInterval(keepAliveInterval)
  }, [params.code, publicKey, refreshUserData, session])

  useEffect(() => {
    batchSaveIntervalRef.current = setInterval(sendStrokesToServer, BATCH_SAVE_INTERVAL_MS)
    return () => {
      if (batchSaveIntervalRef.current) {
        clearInterval(batchSaveIntervalRef.current)
      }
      sendStrokesToServer()
    }
  }, [sendStrokesToServer])

  const broadcastDrawingSegments = useCallback(() => {
    if (broadcastBufferRef.current.length > 0 && channel) {
      const segmentsToSend = [...broadcastBufferRef.current]
      broadcastBufferRef.current = []
      channel.send({ type: "broadcast", event: "draw_batch", payload: { segments: segmentsToSend } })
    }
  }, [channel])

  const handleDrawEnd = useCallback(() => {
    if (broadcastIntervalRef.current) clearInterval(broadcastIntervalRef.current)
    if (drawingTimeoutRef.current) clearTimeout(drawingTimeoutRef.current)
    broadcastDrawingSegments()

    if (currentStrokeRef.current.length > 0) {
      strokesToSaveBufferRef.current.push([...currentStrokeRef.current])
    }
    currentStrokeRef.current = []
  }, [broadcastDrawingSegments])

  const handleDrawStart = () => {
    const pendingStrokes = strokesToSaveBufferRef.current.length
    const availableCredits = credits.paidLines + credits.freeLines

    if (availableCredits - pendingStrokes < 1) {
      toast.error("You are out of line credits! Please purchase more or wait for drawings to save.")
      canvasRef.current?.forceStopDrawing()
      sendStrokesToServer()
      return
    }

    currentStrokeRef.current = []
    broadcastBufferRef.current = []

    if (broadcastIntervalRef.current) clearInterval(broadcastIntervalRef.current)
    broadcastIntervalRef.current = setInterval(broadcastDrawingSegments, BROADCAST_INTERVAL_MS)

    if (drawingTimeoutRef.current) clearTimeout(drawingTimeoutRef.current)
    drawingTimeoutRef.current = setTimeout(() => {
      toast.info("Drawing time limit reached (5 seconds).")
      canvasRef.current?.forceStopDrawing()
    }, DRAWING_TIME_LIMIT_MS)
  }

  const handleDraw = (drawing: Omit<Drawing, "drawer_wallet_address" | "id">) => {
    if (!publicKey || !session) return
    const newSegment: DrawingSegment = { ...drawing, drawer_wallet_address: publicKey.toBase58() }
    broadcastBufferRef.current.push(newSegment)
    currentStrokeRef.current.push(newSegment)
  }

  const handleNuke = async (animation: NukeAnimation) => {
    if (!publicKey || !wallet || !sendTransaction || !session || !channel) {
      toast.error("Wallet not fully connected or session invalid.")
      return
    }

    if (animation.id === "free_nuke") {
      try {
        const result = await freeNukeAction(publicKey.toBase58(), session.id)
        if (!result.success) {
          toast.error("Failed to use free nuke.", { description: result.error })
          return
        }

        toast.success("Nuking the board with a free credit!")
        const usernameForBroadcast = credits.username
        channel.send({
          type: "broadcast",
          event: "nuke",
          payload: { username: usernameForBroadcast, animationId: "default" },
        })
        canvasRef.current?.clearCanvas()
        setNukeEvent({ username: usernameForBroadcast, animationId: "default", eventKey: Date.now() })
        setIsNukeDialogOpen(false)
        setCredits((p) => ({ ...p, freeNukes: p.freeNukes - 1 }))
      } catch (error: any) {
        console.error("Free nuke error:", error)
        toast.error("Failed to use free nuke.", { description: error.message })
      }
      return
    }

    try {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed")
      const transaction = new Transaction({ feePayer: publicKey, blockhash, lastValidBlockHeight }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: APP_WALLET_ADDRESS,
          lamports: animation.price * LAMPORTS_PER_SOL,
        }),
      )

      const signature = await sendTransaction(transaction, connection)
      toast.info("Transaction sent! Awaiting confirmation...")

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed")
      toast.success("Payment confirmed! Nuking the board...")

      const usernameForBroadcast = credits.username
      channel.send({
        type: "broadcast",
        event: "nuke",
        payload: { username: usernameForBroadcast, animationId: animation.id },
      })
      canvasRef.current?.clearCanvas()
      setNukeEvent({ username: usernameForBroadcast, animationId: animation.id, eventKey: Date.now() })
      setIsNukeDialogOpen(false)

      processNukePurchase(publicKey.toBase58(), session.id, animation, signature).catch((err) => {
        console.error("Background nuke processing failed:", err)
        toast.warning("Nuke successful, but there was a server issue. Please contact support.", { duration: 10000 })
      })
    } catch (error: any) {
      console.error("Nuke purchase failed", error)
      toast.error("Nuke purchase failed", { description: error.message, duration: 6000 })
    }
  }

  if (isLoading)
    return <div className="flex h-screen w-full items-center justify-center bg-deep-space text-white">Loading…</div>
  if (!session)
    return (
      <div className="flex h-screen w-full items-center justify-center bg-deep-space text-white">
        Session not found.
      </div>
    )

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-deep-space gap-4 p-4">
      <NukeAnimationOverlay nukeEvent={nukeEvent} />
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-white">
        <Edit className="h-5 w-5 text-neon-pink" />
        <span className="font-bold">DRAWING MODE</span>
      </div>
      <Canvas
        ref={canvasRef}
        width={1280}
        height={720}
        isDrawable={!!publicKey}
        initialDrawings={initialDrawings}
        onDrawStart={handleDrawStart}
        onDraw={handleDraw}
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
          >
            <Bomb className="mr-2 h-4 w-4" />
            Nuke Board
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-neon-pink text-white hover:bg-neon-pink/90">Buy Lines</Button>
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
