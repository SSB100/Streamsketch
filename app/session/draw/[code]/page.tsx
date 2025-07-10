"use client"

import { useEffect, useState, useCallback } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Connection, SystemProgram, Transaction } from "@solana/web3.js"
import { toast } from "sonner"
import { getSessionData, initiateNukeAction, getFreeCreditsForSession, recordDrawingAction } from "@/app/actions"
import type { Drawing, Session } from "@/lib/types"
import { Canvas } from "@/components/whiteboard/canvas"
import { ColorPicker } from "@/components/whiteboard/color-picker"
import { BrushSizePicker } from "@/components/whiteboard/brush-size-picker"
import { NukeSelectionDialog } from "@/components/whiteboard/nuke-selection-dialog"
import { Button } from "@/components/ui/button"
import { APP_WALLET_ADDRESS } from "@/lib/constants"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import type { NukeAnimation } from "@/lib/nuke-animations"
import { NukeAnimationOverlay } from "@/components/whiteboard/nuke-animation-overlay"
import { useRealtimeChannel } from "@/hooks/use-realtime-channel"
import { Loader2 } from "lucide-react"

const rpcHost = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST!
const connection = new Connection(rpcHost)

export default function DrawPage({ params }: { params: { code: string } }) {
  const { publicKey, sendTransaction } = useWallet()
  const [session, setSession] = useState<Session | null>(null)
  const [initialDrawings, setInitialDrawings] = useState<Drawing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isNukeDialogOpen, setIsNukeDialogOpen] = useState(false)
  const [freeNukeCount, setFreeNukeCount] = useState(0)
  const [nukeTrigger, setNukeTrigger] = useState<{ animationId: string; timestamp: number } | null>(null)

  const channel = useRealtimeChannel(session?.id ? `session-${session.id}` : null)

  const fetchSessionData = useCallback(async () => {
    try {
      const { session: newSession, drawings } = await getSessionData(params.code)
      if (newSession) {
        setSession(newSession)
        setInitialDrawings(drawings)
        if (publicKey) {
          const { freeNukes } = await getFreeCreditsForSession(publicKey.toBase58(), newSession.id)
          setFreeNukeCount(freeNukes)
        }
      }
    } catch (error) {
      console.error("Failed to fetch session data:", error)
      toast.error("Failed to load session.")
    } finally {
      setIsLoading(false)
    }
  }, [params.code, publicKey])

  useEffect(() => {
    fetchSessionData()
  }, [fetchSessionData])

  const handleNuke = async (nukeAnimation: NukeAnimation) => {
    if (!publicKey || !session) {
      toast.error("Wallet or session not available.")
      return
    }

    if (nukeAnimation.id === "free_nuke") {
      if (freeNukeCount <= 0) {
        toast.error("You have no free nukes to use.")
        return
      }
      const result = await initiateNukeAction(publicKey.toBase58(), session.id, nukeAnimation)
      if (result.success) {
        toast.success("Free nuke activated!")
        setFreeNukeCount((prev) => prev - 1)
      } else {
        toast.error("Failed to use free nuke.", { description: result.error })
      }
    } else {
      // Paid nuke logic
      if (!sendTransaction) {
        toast.error("Wallet not connected or sendTransaction not available.")
        return
      }
      try {
        toast.info("Preparing transaction...")
        // THE FIX: Get the latest blockhash before creating the transaction
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

        const transaction = new Transaction({
          feePayer: publicKey,
          recentBlockhash: blockhash,
        }).add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: APP_WALLET_ADDRESS,
            lamports: nukeAnimation.price * LAMPORTS_PER_SOL,
          }),
        )

        const signature = await sendTransaction(transaction, connection)
        toast.info("Transaction sent! Waiting for confirmation...")

        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "processed")

        const result = await initiateNukeAction(publicKey.toBase58(), session.id, nukeAnimation, signature)
        if (result.success) {
          toast.success(`${nukeAnimation.name} purchased and activated!`)
        } else {
          toast.error(`Failed to activate ${nukeAnimation.name}.`, { description: result.error })
        }
      } catch (error: any) {
        console.error("Nuke purchase failed:", error)
        toast.error("Nuke purchase failed.", { description: error.message })
      }
    }
    setIsNukeDialogOpen(false)
  }

  const handleDraw = async (drawingData: { points: any[]; color: string; lineWidth: number }) => {
    if (!publicKey || !session) {
      toast.error("You must connect your wallet to draw.")
      return false // Indicate failure
    }
    const result = await recordDrawingAction(publicKey.toBase58(), session.id, drawingData)
    if (!result.success) {
      toast.error("Failed to save drawing.", { description: result.error })
      return false
    }
    return true // Indicate success
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4 text-lg">Loading Session...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">
        <p>Session not found.</p>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-900">
      <NukeAnimationOverlay nukeTrigger={nukeTrigger} />
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-4 rounded-lg bg-gray-800/50 p-2 backdrop-blur-sm">
        <ColorPicker />
        <BrushSizePicker />
      </div>
      <div className="absolute top-4 right-4 z-10">
        <Button onClick={() => setIsNukeDialogOpen(true)} variant="destructive">
          Nuke Board
        </Button>
      </div>
      <Canvas
        sessionId={session.id}
        initialDrawings={initialDrawings}
        onDraw={handleDraw}
        channel={channel}
        setNukeTrigger={setNukeTrigger}
      />
      <NukeSelectionDialog
        isOpen={isNukeDialogOpen}
        onOpenChange={setIsNukeDialogOpen}
        onNuke={handleNuke}
        freeNukeCount={freeNukeCount}
      />
    </div>
  )
}
