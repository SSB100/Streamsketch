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
  spendDrawingCredit,
  getUserData,
  processNukePurchase,
  addDrawingSegments,
  getFreeCreditsForSession,
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

// Optimize broadcast interval for better performance
const BROADCAST_INTERVAL_MS = 100 // Increased from 50ms for better performance
const DRAWING_TIME_LIMIT_MS = 5000

// Add drawing compression function
const compressDrawingSegments = (segments: DrawingSegment[]): DrawingSegment[] => {
  if (segments.length <= 1) return segments

  const compressed: DrawingSegment[] = []
  let currentSegment = segments[0]

  for (let i = 1; i < segments.length; i++) {
    const nextSegment = segments[i]

    // If same color and line width, and points are close, skip intermediate points
    if (
      currentSegment.drawing_data.color === nextSegment.drawing_data.color &&
      currentSegment.drawing_data.lineWidth === nextSegment.drawing_data.lineWidth
    ) {
      const distance = Math.sqrt(
        Math.pow(nextSegment.drawing_data.from.x - currentSegment.drawing_data.to.x, 2) +
          Math.pow(nextSegment.drawing_data.from.y - currentSegment.drawing_data.to.y, 2),
      )

      // Skip points that are very close together (< 2 pixels)
      if (distance < 2) {
        continue
      }
    }

    compressed.push(currentSegment)
    currentSegment = nextSegment
  }

  compressed.push(currentSegment)
  return compressed
}

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
  const [nukeEvent, setNukeEvent] = useState<{ username: string | null; animationId: string } | null>(null)
  const [color, setColor] = useState("#FFFFFF")
  const [brushSize, setBrushSize] = useState(5)

  const canvasRef = useRef<CanvasHandle>(null)
  const broadcastBufferRef = useRef<DrawingSegment[]>([])
  const currentStrokeRef = useRef<DrawingSegment[]>([])
  const broadcastIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const drawingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstSegmentOfStroke = useRef(true)

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
      setNukeEvent({ username, animationId })
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
        getFreeCreditsForSession(publicKey.toBase58(), session.id), // Changed from session.owner_wallet_address to session.id
      ])
      console.log("[DrawPage] Refreshed free credits for session:", session.id, freeData)
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
          const [paidData, freeData] = await Promise.all([
            getUserData(publicKey.toBase58()),
            getFreeCreditsForSession(publicKey.toBase58(), s.id), // Changed from s.owner_wallet_address to s.id
          ])
          console.log("[DrawPage] Free credits for session:", s.id, freeData)
          setCredits({
            paidLines: paidData.lineCredits,
            username: paidData.username,
            freeLines: freeData.freeLines,
            freeNukes: freeData.freeNukes,
          })
        }
      } catch (err) {
        console.error("Bootstrap failed:", err)
        toast.error("Failed to load session data")
      } finally {
        setIsLoading(false)
      }
    }
    bootstrap()
  }, [params.code, publicKey])

  const broadcastDrawingSegments = useCallback(() => {
    if (broadcastBufferRef.current.length > 0 && channel) {
      const segmentsToSend = compressDrawingSegments([...broadcastBufferRef.current])
      broadcastBufferRef.current = []
      channel.send({ type: "broadcast", event: "draw_batch", payload: { segments: segmentsToSend } })
    }
  }, [channel])

  const handleDrawEnd = useCallback(() => {
    if (broadcastIntervalRef.current) clearInterval(broadcastIntervalRef.current)
    if (drawingTimeoutRef.current) clearTimeout(drawingTimeoutRef.current)
    broadcastDrawingSegments()

    if (publicKey && session && currentStrokeRef.current.length > 0) {
      addDrawingSegments(session.id, currentStrokeRef.current).catch((err) => {
        console.error("Failed to save full drawing stroke to DB:", err)
        toast.error("Failed to save your drawing. Please try again.")
      })
    }
    currentStrokeRef.current = []
  }, [broadcastDrawingSegments, publicKey, session])

  const handleDrawStart = () => {
    if (credits.paidLines < 1 && credits.freeLines < 1) {
      toast.error("Out of line credits!")
      canvasRef.current?.forceStopDrawing()
      return
    }
    isFirstSegmentOfStroke.current = true
    broadcastBufferRef.current = []
    currentStrokeRef.current = []

    if (broadcastIntervalRef.current) clearInterval(broadcastIntervalRef.current)
    broadcastIntervalRef.current = setInterval(broadcastDrawingSegments, BROADCAST_INTERVAL_MS)

    if (drawingTimeoutRef.current) clearTimeout(drawingTimeoutRef.current)
    drawingTimeoutRef.current = setTimeout(() => {
      toast.info("Drawing time limit reached (5 seconds).")
      canvasRef.current?.forceStopDrawing()
    }, DRAWING_TIME_LIMIT_MS)
  }

  const handleDraw = async (drawing: Omit<Drawing, "drawer_wallet_address" | "id">) => {
    if (!publicKey || !session) return

    const newSegment: DrawingSegment = { ...drawing, drawer_wallet_address: publicKey.toBase58() }
    broadcastBufferRef.current.push(newSegment)
    currentStrokeRef.current.push(newSegment)

    if (isFirstSegmentOfStroke.current) {
      isFirstSegmentOfStroke.current = false
      if (credits.freeLines > 0) {
        setCredits((p) => ({ ...p, freeLines: p.freeLines - 1 }))
      } else {
        setCredits((p) => ({ ...p, paidLines: p.paidLines - 1 }))
      }

      try {
        const res = await spendDrawingCredit(publicKey.toBase58(), session.id, newSegment)
        if (!res.success) {
          toast.error("Failed to spend credit", { description: res.error })
          await refreshUserData()
          canvasRef.current?.forceStopDrawing()
        }
      } catch (error) {
        console.error("Error spending drawing credit:", error)
        toast.error("Failed to spend credit")
        await refreshUserData()
        canvasRef.current?.forceStopDrawing()
      }
    }
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
          payload: { username: usernameForBroadcast, animationId: animation.id },
        })
        canvasRef.current?.clearCanvas()
        setNukeEvent({ username: usernameForBroadcast, animationId: animation.id })
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
      setNukeEvent({ username: usernameForBroadcast, animationId: animation.id })
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
