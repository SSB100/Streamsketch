"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { toast } from "sonner"
import { throttle } from "lodash"

import type { Drawing, UserData } from "@/lib/types"
import { Canvas, type CanvasHandle } from "@/components/whiteboard/canvas"
import { ColorPicker } from "@/components/whiteboard/color-picker"
import { BrushSizePicker } from "@/components/whiteboard/brush-size-picker"
import { NukeSelectionDialog } from "@/components/whiteboard/nuke-selection-dialog"
import { NukeAnimationOverlay } from "@/components/whiteboard/nuke-animation-overlay"
import { Button } from "@/components/ui/button"
import { useRealtimeChannel } from "@/hooks/use-realtime-channel"
import {
  getSessionData,
  getUserData,
  spendDrawingCredit,
  addDrawingSegments,
  broadcastNuke,
  processNukePurchase,
  triggerFreeNukeAction,
  broadcastDrawings,
} from "@/app/actions"
import { DEFAULT_COLOR, DEFAULT_LINE_WIDTH, APP_WALLET_ADDRESS } from "@/lib/constants"
import type { NukeAnimation } from "@/lib/nuke-animations"
import { Bomb, Loader2, Coins, Plus } from "lucide-react"
import { PurchaseCreditsDialog } from "@/components/whiteboard/purchase-credits-dialog"

export default function DrawPage({ params }: { params: { code: string } }) {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()

  const [session, setSession] = useState<{ id: string } | null>(null)
  const [initialDrawings, setInitialDrawings] = useState<Drawing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [lineWidth, setLineWidth] = useState(DEFAULT_LINE_WIDTH)
  const [nukeEvent, setNukeEvent] = useState<{ username: string | null; animationId: string } | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isNukeDialogOpen, setIsNukeDialogOpen] = useState(false)
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false)

  const canvasRef = useRef<CanvasHandle>(null)
  const drawingBuffer = useRef<Omit<Drawing, "drawer_wallet_address" | "id">[]>([])
  const isSpendingCreditRef = useRef(false)

  const refreshUserData = useCallback(async () => {
    if (!publicKey) return
    try {
      const data = await getUserData(publicKey.toBase58())
      setUserData(data)
    } catch (error) {
      console.error("Failed to refresh user data:", error)
      toast.error("Could not update your credit balance.")
    }
  }, [publicKey])

  const handleIncomingDrawBatch = useCallback(({ segments }: { segments: Drawing[] }) => {
    canvasRef.current?.drawBatchFromBroadcast(segments)
  }, [])

  const handleIncomingNuke = useCallback(
    ({ username, animationId }: { username: string | null; animationId: string }) => {
      canvasRef.current?.clearCanvas()
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
        } else {
          toast.error("Session not found or is inactive.")
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

  useEffect(() => {
    if (session && publicKey) {
      refreshUserData()
    }
  }, [session, publicKey, refreshUserData])

  const sendDrawingBuffer = useCallback(
    throttle(async () => {
      if (drawingBuffer.current.length === 0 || !session || !publicKey) return

      const segmentsToBroadcast = drawingBuffer.current.map((d) => ({
        ...d,
        drawer_wallet_address: publicKey.toBase58(),
      }))
      const segmentsToSave = [...drawingBuffer.current]
      drawingBuffer.current = []

      try {
        await Promise.all([
          broadcastDrawings(
            session.id,
            publicKey.toBase58(),
            segmentsToBroadcast.map((s) => s.drawing_data),
          ),
          addDrawingSegments(
            session.id,
            segmentsToSave.map((s) => ({ drawing_data: s.drawing_data, drawer_wallet_address: publicKey.toBase58() })),
          ),
        ])
      } catch (error) {
        console.error("Failed to send drawings:", error)
        toast.error("Failed to send drawing.")
        drawingBuffer.current = [...segmentsToSave, ...drawingBuffer.current]
      }
    }, 200),
    [session, publicKey],
  )

  const handleDrawStart = useCallback(async () => {
    if (!publicKey || !session || !userData || isSpendingCreditRef.current) return

    const totalCredits = (userData.lineCredits || 0) + (userData.totalFreeLines || 0)
    if (totalCredits <= 0) {
      toast.error("Out of line credits! Purchase more in the dashboard.")
      return
    }

    setIsDrawing(true)
    isSpendingCreditRef.current = true

    try {
      const { success, error } = await spendDrawingCredit(session.id, publicKey.toBase58())
      if (success) {
        await refreshUserData()
      } else {
        toast.error("Failed to use credit", { description: error })
        setIsDrawing(false)
        canvasRef.current?.forceStopDrawing()
      }
    } catch (error: any) {
      toast.error("An error occurred", { description: error.message })
      setIsDrawing(false)
      canvasRef.current?.forceStopDrawing()
    } finally {
      isSpendingCreditRef.current = false
    }
  }, [publicKey, session, userData, refreshUserData])

  const handleDraw = useCallback(
    (drawing: Omit<Drawing, "drawer_wallet_address" | "id">) => {
      if (!isDrawing) return
      drawingBuffer.current.push(drawing)
      sendDrawingBuffer()
    },
    [isDrawing, sendDrawingBuffer],
  )

  const handleDrawEnd = useCallback(() => {
    sendDrawingBuffer.flush()
    setIsDrawing(false)
  }, [sendDrawingBuffer])

  const handleNuke = async (animation: NukeAnimation) => {
    if (!publicKey || !session || !userData) {
      toast.error("Cannot perform nuke. Wallet or session not ready.")
      return
    }

    setIsNukeDialogOpen(false)

    // Handle Free Nuke
    if (animation.id === "free_nuke") {
      if (userData.totalFreeNukes <= 0) {
        toast.error("You don't have any free nukes for this session.")
        return
      }
      const toastId = toast.loading("Using free nuke...")
      try {
        const result = await triggerFreeNukeAction(publicKey.toBase58(), session.id)
        if (result.success) {
          await broadcastNuke(session.id, userData.username, animation.id)
          toast.success("Nuke successful!", { id: toastId })
          refreshUserData()
        } else {
          toast.error("Free nuke failed", { id: toastId, description: result.error })
        }
      } catch (error: any) {
        toast.error("An error occurred", { id: toastId, description: error.message })
      }
      return
    }

    // Handle Paid Nuke
    if (!sendTransaction) {
      toast.error("Wallet does not support sending transactions.")
      return
    }

    const toastId = toast.loading("Preparing nuke transaction...")
    try {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed")
      const transaction = new Transaction({ feePayer: publicKey, blockhash, lastValidBlockHeight }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: APP_WALLET_ADDRESS,
          lamports: animation.price * LAMPORTS_PER_SOL,
        }),
      )

      toast.loading("Please approve the transaction in your wallet...", { id: toastId })
      const signature = await sendTransaction(transaction, connection)
      toast.loading("Confirming transaction...", { id: toastId })

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed")
      toast.loading("Processing nuke...", { id: toastId })

      await processNukePurchase(publicKey.toBase58(), session.id, animation, signature)
      await broadcastNuke(session.id, userData.username, animation.id)

      toast.success("Nuke successful!", { id: toastId })
      refreshUserData()
    } catch (error: any) {
      console.error("Nuke purchase failed", error)
      toast.error("Nuke failed", { id: toastId, description: error.message, duration: 6000 })
    }
  }

  const CreditsDisplay = () => (
    <div className="flex items-center gap-2 rounded-full bg-black/50 px-2 py-2 text-white backdrop-blur-sm">
      <div className="flex items-center gap-2 border-r border-white/20 pr-3">
        <Coins className="h-5 w-5 text-yellow-400" />
        <span className="font-bold">
          {userData ? (
            `${((userData.lineCredits || 0) + (userData.totalFreeLines || 0)).toLocaleString()}`
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
        </span>
        <span className="text-sm text-muted-foreground">credits</span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="rounded-full hover:bg-white/10"
        onClick={() => setIsPurchaseDialogOpen(true)}
      >
        <Plus className="mr-1 h-4 w-4" />
        Buy
      </Button>
    </div>
  )

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-deep-space text-white">Loading...</div>
  }

  if (!session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-deep-space text-white">
        Session not found or is inactive.
      </div>
    )
  }

  if (!publicKey) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-deep-space text-white">
        Please connect your wallet to draw.
      </div>
    )
  }

  return (
    <main className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-deep-space p-4">
      <NukeAnimationOverlay nukeEvent={nukeEvent} />
      <div className="relative w-full max-w-full h-full max-h-full aspect-[16/9]">
        <Canvas
          ref={canvasRef}
          width={1280}
          height={720}
          isDrawable={true}
          initialDrawings={initialDrawings}
          onDraw={handleDraw}
          onDrawStart={handleDrawStart}
          onDrawEnd={handleDrawEnd}
          color={color}
          lineWidth={lineWidth}
          className="h-full w-full"
        />
      </div>

      <div className="absolute left-4 top-4 flex items-center gap-2">
        <CreditsDisplay />
      </div>

      <div className="absolute bottom-4 flex items-center gap-4 rounded-full bg-black/50 p-2 backdrop-blur-sm">
        <ColorPicker selectedColor={color} onColorChange={setColor} />
        <BrushSizePicker size={lineWidth} onSizeChange={setLineWidth} />
        <Button
          variant="destructive"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={() => setIsNukeDialogOpen(true)}
        >
          <Bomb className="h-6 w-6" />
        </Button>
      </div>

      <NukeSelectionDialog
        isOpen={isNukeDialogOpen}
        onOpenChange={setIsNukeDialogOpen}
        onNuke={handleNuke}
        freeNukeCount={userData?.totalFreeNukes ?? 0}
      />
      <PurchaseCreditsDialog
        isOpen={isPurchaseDialogOpen}
        onOpenChange={setIsPurchaseDialogOpen}
        onPurchaseSuccess={refreshUserData}
      />
    </main>
  )
}
