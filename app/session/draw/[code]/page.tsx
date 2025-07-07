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

const BROADCAST_INTERVAL_MS = 200
const DRAWING_TIME_LIMIT_MS = 5000

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
  const creditSpentRef = useRef(false)

  // Use a ref to hold the session to prevent re-creating callbacks that depend on it
  const sessionRef = useRef(session)
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const handleIncomingDrawBatch = useCallback(
    ({ segments }: { segments: Drawing[] }) => {
      if (segments.length > 0 && segments[0]?.drawer_wallet_address !== publicKey?.toBase58()) {
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

  // This callback is now stable and won't cause re-renders.
  // It safely reads the session ID from a ref.
  const refreshUserData = useCallback(async () => {
    if (!publicKey || !sessionRef.current) return
    try {
      const [paidData, freeData] = await Promise.all([
        getUserData(publicKey.toBase58()),
        getFreeCreditsForSession(publicKey.toBase58(), sessionRef.current.id),
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
  }, [publicKey])

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

        // FIX: Manually update the ref before the first data fetch to prevent a race condition.
        // This ensures `refreshUserData` has the session ID immediately.
        sessionRef.current = s as { id: string; owner_wallet_address: string }
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
  }, [params.code, publicKey, refreshUserData])

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

    if (publicKey && sessionRef.current && currentStrokeRef.current.length > 0) {
      const strokeToSave = [...currentStrokeRef.current]
      addDrawingSegments(sessionRef.current.id, strokeToSave).catch((err) => {
        console.error("Failed to save drawing stroke:", err)
      })
    }

    currentStrokeRef.current = []
    creditSpentRef.current = false
  }, [broadcastDrawingSegments, publicKey])

  const handleDrawStart = useCallback(() => {
    if (credits.paidLines < 1 && credits.freeLines < 1) {
      toast.error("Out of line credits!")
      canvasRef.current?.forceStopDrawing()
      return
    }

    isFirstSegmentOfStroke.current = true
    creditSpentRef.current = false
    broadcastBufferRef.current = []
    currentStrokeRef.current = []

    if (broadcastIntervalRef.current) clearInterval(broadcastIntervalRef.current)
    broadcastIntervalRef.current = setInterval(broadcastDrawingSegments, BROADCAST_INTERVAL_MS)

    if (drawingTimeoutRef.current) clearTimeout(drawingTimeoutRef.current)
    drawingTimeoutRef.current = setTimeout(() => {
      toast.info("Drawing time limit reached (5 seconds).")
      canvasRef.current?.forceStopDrawing()
    }, DRAWING_TIME_LIMIT_MS)
  }, [credits.paidLines, credits.freeLines, broadcastDrawingSegments])

  const handleDraw = useCallback(
    async (drawing: Omit<Drawing, "drawer_wallet_address" | "id">) => {
      if (!publicKey || !sessionRef.current) return

      const newSegment: DrawingSegment = { ...drawing, drawer_wallet_address: publicKey.toBase58() }
      broadcastBufferRef.current.push(newSegment)
      currentStrokeRef.current.push(newSegment)

      if (isFirstSegmentOfStroke.current && !creditSpentRef.current) {
        isFirstSegmentOfStroke.current = false
        creditSpentRef.current = true

        setCredits((p) => ({
          ...p,
          freeLines: p.freeLines > 0 ? p.freeLines - 1 : 0,
          paidLines: p.freeLines > 0 ? p.paidLines : p.paidLines - 1,
        }))

        spendDrawingCredit(publicKey.toBase58(), sessionRef.current.id).then((res) => {
          if (!res.success) {
            console.error("Failed to spend credit:", res.error)
            toast.error("Credit spend failed, refreshing balance.")
            refreshUserData()
          }
        })
      }
    },
    [publicKey, refreshUserData],
  )

  const handleNuke = async (animation: NukeAnimation) => {
    if (!publicKey || !wallet || !sendTransaction || !sessionRef.current || !channel) {
      toast.error("Wallet not fully connected or session invalid.")
      return
    }

    if (animation.id === "free_nuke") {
      try {
        const result = await freeNukeAction(publicKey.toBase58(), sessionRef.current.id)
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

      processNukePurchase(publicKey.toBase58(), sessionRef.current.id, animation, signature).catch((err) => {
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
