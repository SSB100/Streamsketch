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
  recordDrawingAction,
} from "@/app/actions"
import { Rocket, Edit, Bomb, RefreshCw } from "lucide-react"
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

function DrawPageContent({ params }: { params: { code: string } }) {
  const { publicKey, sendTransaction, wallet } = useWallet()
  const { connection } = useConnection()
  const freeNukeAction = useFreeNukeAction()

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

  // --- Realtime Channel (Nukes Only on Draw Page) ---
  const handleIncomingNuke = useCallback(
    ({ username, animationId }: { username: string | null; animationId: string }) => {
      setDrawings([]) // Clear local drawings state
      canvasRef.current?.clearCanvas()
      setNukeEvent({ username, animationId })
    },
    [],
  )

  // The draw page doesn't need to listen for other drawings, only nukes.
  const channelOptions = useMemo(
    () => ({
      onNukeBroadcast: handleIncomingNuke,
      onDrawBroadcast: () => {}, // No-op on the draw page
    }),
    [handleIncomingNuke],
  )
  useRealtimeChannel(session?.id ?? null, channelOptions)

  // --- Data Fetching ---
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

  // --- Initial Page Load ---
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

  // Refresh user-specific data when the session or user changes
  useEffect(() => {
    if (session && publicKey) {
      refreshUserData()
    }
  }, [session, publicKey, refreshUserData])

  // --- Canvas Callbacks ---
  const handleDrawStart = () => {
    if (!publicKey) {
      toast.error("Please connect your wallet to draw.")
      return false
    }
    if (credits.paidLines + credits.freeLines < 1) {
      toast.error("You are out of line credits!")
      return false
    }
    return true
  }

  const handleDrawEnd = async (line: Omit<Drawing["drawing_data"], "drawer_wallet_address">) => {
    if (!publicKey || !session) return

    const optimisticDrawing: Drawing = {
      id: Date.now(),
      drawer_wallet_address: publicKey.toBase58(),
      drawing_data: line,
    }
    setDrawings((prev) => [...prev, optimisticDrawing])
    setCredits((p) => (p.freeLines > 0 ? { ...p, freeLines: p.freeLines - 1 } : { ...p, paidLines: p.paidLines - 1 }))

    const { success, error } = await recordDrawingAction(publicKey.toBase58(), session.id, line)

    if (!success) {
      toast.error("Failed to save drawing", { description: error })
      setDrawings((prev) => prev.filter((d) => d.id !== optimisticDrawing.id))
      await refreshUserData()
    }
  }

  // --- Nuke Handler ---
  const handleNuke = async (animation: NukeAnimation) => {
    if (!publicKey || !wallet || !sendTransaction || !session) {
      toast.error("Wallet not fully connected or session invalid.")
      return
    }

    if (animation.id === "free_nuke") {
      const result = await freeNukeAction(publicKey.toBase58(), session.id)
      if (!result.success) {
        toast.error("Failed to use free nuke.", { description: result.error })
        return
      }
      setCredits((p) => ({ ...p, freeNukes: p.freeNukes - 1 }))
      canvasRef.current?.clearCanvas()
      setNukeEvent({ username: credits.username, animationId: animation.id })
      setIsNukeDialogOpen(false)
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

      canvasRef.current?.clearCanvas()
      setNukeEvent({ username: credits.username, animationId: animation.id })
      setIsNukeDialogOpen(false)

      processNukePurchase(publicKey.toBase58(), session.id, animation, signature).catch((err) => {
        console.error("Background nuke processing failed:", err)
      })
    } catch (error: any) {
      console.error("Nuke purchase failed", error)
      toast.error("Nuke purchase failed", { description: error.message, duration: 6000 })
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

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-deep-space gap-4 p-4">
      <NukeAnimationOverlay nukeEvent={nukeEvent} />
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-white">
        <Edit className="h-5 w-5 text-neon-pink" />
        <span className="font-bold">DRAWING MODE</span>
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
