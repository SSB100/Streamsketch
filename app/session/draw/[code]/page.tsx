"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Canvas } from "@/components/whiteboard/canvas"
import { BrushSizePicker } from "@/components/whiteboard/brush-size-picker"
import { ColorPicker } from "@/components/whiteboard/color-picker"
import { NukeSelectionDialog } from "@/components/whiteboard/nuke-selection-dialog"
import { NukeAnimationOverlay } from "@/components/whiteboard/nuke-animation-overlay"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CustomCursor } from "@/components/custom-cursor"
import { useWallet } from "@solana/wallet-adapter-react"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/hooks/use-user"
import { useRealtimeChannel } from "@/hooks/use-realtime-channel"
import { recordDrawing, purchaseNuke } from "@/app/actions"
import { toast } from "sonner"
import { Palette, Zap, Infinity } from "lucide-react"
import { useFreeNuke } from "@/app/actions/useFreeNuke"
import { notFound } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { getSessionData } from "@/app/actions"
import { Badge } from "@/components/ui/badge"

interface SessionData {
  id: string
  name: string
  code: string
  is_active: boolean
  is_free: boolean
  owner_id: string
}

interface UserStats {
  credits: number
  free_nukes: number
}

interface DrawPageProps {
  params: {
    code: string
  }
}

export default async function DrawPage({ params }: DrawPageProps) {
  const supabase = createSupabaseServerClient()
  const sessionCode = params.code

  const [userStats, setUserStats] = useState<UserStats>({ credits: 0, free_nukes: 0 })
  const [loading, setLoading] = useState(false)
  const [brushSize, setBrushSize] = useState(3)
  const [brushColor, setBrushColor] = useState("#ffffff")
  const [isDrawing, setIsDrawing] = useState(false)
  const [showNukeDialog, setShowNukeDialog] = useState(false)
  const [nukeAnimation, setNukeAnimation] = useState<{ type: string; timestamp: number } | null>(null)
  const [participantCount, setParticipantCount] = useState(0)
  const useFreeNukeHook = useFreeNuke(sessionCode)
  const { user } = useUser()
  const router = useRouter()
  const { connected } = useWallet()

  const { sendMessage } = useRealtimeChannel(`session:${sessionCode}`, {
    onDrawing: (payload) => {
      // Handle incoming drawing data
      console.log("Received drawing:", payload)
    },
    onNuke: (payload) => {
      setNukeAnimation({ type: payload.nuke_type, timestamp: Date.now() })
    },
    onParticipantUpdate: (payload) => {
      setParticipantCount(payload.count || 0)
    },
  })

  // Load user stats
  useEffect(() => {
    const loadUserStats = async () => {
      if (!user) return

      try {
        const { data, error } = await createClient()
          .from("users")
          .select("credits, free_nukes")
          .eq("id", user.id)
          .single()

        if (data) {
          setUserStats(data)
        }
      } catch (error) {
        console.error("Error loading user stats:", error)
      }
    }

    loadUserStats()
  }, [user])

  // Get session details including is_free flag and drawings
  const { session, drawings } = await getSessionData(sessionCode)

  if (!session) {
    notFound()
  }

  if (!session.is_active) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Session Inactive</h1>
          <p className="text-muted-foreground">This session is no longer active.</p>
        </div>
      </div>
    )
  }

  const handleDrawingComplete = async (drawingData: any) => {
    if (!session || !user) return

    try {
      const result = await recordDrawing(sessionCode, drawingData)

      if (result.success) {
        // Update user stats if it's not a free session
        if (!result.is_free_session && result.credits_remaining !== undefined) {
          setUserStats((prev) => ({ ...prev, credits: result.credits_remaining }))
        }

        // Send drawing to other participants via realtime
        sendMessage("drawing", drawingData)

        toast.success(`Drawing recorded! ${result.lines_drawn} lines drawn`)
      } else {
        toast.error(result.error || "Failed to record drawing")
      }
    } catch (error) {
      console.error("Error recording drawing:", error)
      toast.error("Failed to record drawing")
    }
  }

  const handleNukeSelect = async (nukeType: string, useFree = false) => {
    if (!session || !user) return

    try {
      let result
      if (useFree) {
        result = await useFreeNukeHook(nukeType)
      } else {
        result = await purchaseNuke(sessionCode, nukeType)
      }

      if (result.success) {
        // Update user stats
        if (useFree) {
          setUserStats((prev) => ({ ...prev, free_nukes: prev.free_nukes - 1 }))
        } else {
          setUserStats((prev) => ({ ...prev, credits: result.credits_remaining || prev.credits }))
        }

        // Trigger nuke animation
        setNukeAnimation({ type: nukeType, timestamp: Date.now() })

        // Send nuke to other participants via realtime
        sendMessage("nuke", { nuke_type: nukeType, user_id: user.id })

        toast.success(`${nukeType} activated!`)
      } else {
        toast.error(result.error || "Failed to activate nuke")
      }
    } catch (error) {
      console.error("Error activating nuke:", error)
      toast.error("Failed to activate nuke")
    }

    setShowNukeDialog(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-deep-space">
        <div className="text-white">Loading session...</div>
      </div>
    )
  }

  const isFreeSession = session.is_free

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <CustomCursor />
      <Header sessionCode={sessionCode} />

      {/* Free Session Indicator */}
      {isFreeSession && (
        <div className="bg-green-600/20 border-b border-green-500/30 px-4 py-2">
          <div className="container mx-auto flex items-center justify-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
              <Infinity className="h-4 w-4 mr-1" />
              FREE SESSION - UNLIMITED LINES
            </Badge>
            <span className="text-sm text-green-700">Draw as much as you want! Nukes still require credits.</span>
          </div>
        </div>
      )}

      <main className="container mx-auto p-4 relative">
        <Canvas
          sessionId={session.id}
          sessionCode={sessionCode}
          initialDrawings={drawings}
          isFreeSession={isFreeSession}
        />
      </main>

      {/* Sidebar */}
      <div className="w-80 border-l border-white/10 bg-black/20 p-4 fixed top-0 right-0 h-full">
        <div className="space-y-6">
          {/* User Stats */}
          {connected && user && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/70">Drawing Credits</span>
                    {isFreeSession ? (
                      <div className="flex items-center gap-1 text-green-400">
                        <Infinity className="h-4 w-4" />
                        <span className="font-semibold">UNLIMITED LINES</span>
                      </div>
                    ) : (
                      <span className="font-semibold text-white">{userStats.credits}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/70">Free Nukes</span>
                    <span className="font-semibold text-white">{userStats.free_nukes}</span>
                  </div>
                  {!isFreeSession && userStats.credits === 0 && (
                    <div className="text-xs text-yellow-400">
                      Need more credits? Visit your dashboard to purchase more.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Drawing Tools */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white/70">Brush Size</label>
                  <BrushSizePicker value={brushSize} onChange={setBrushSize} />
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70">Color</label>
                  <ColorPicker value={brushColor} onChange={setBrushColor} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {connected && user && (
            <div className="space-y-2">
              <Button
                onClick={() => setShowNukeDialog(true)}
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={userStats.credits === 0 && userStats.free_nukes === 0}
              >
                <Zap className="mr-2 h-4 w-4" />
                Activate Nuke
              </Button>
            </div>
          )}

          {!connected && (
            <Card className="bg-yellow-500/10 border-yellow-500/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <Palette className="mx-auto mb-2 h-8 w-8 text-yellow-400" />
                  <p className="text-sm text-yellow-200">Connect your wallet to start drawing!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Nuke Selection Dialog */}
      <NukeSelectionDialog
        open={showNukeDialog}
        onOpenChange={setShowNukeDialog}
        onSelect={handleNukeSelect}
        userCredits={userStats.credits}
        freeNukes={userStats.free_nukes}
      />

      {/* Nuke Animation Overlay */}
      {nukeAnimation && (
        <NukeAnimationOverlay nukeType={nukeAnimation.type} onComplete={() => setNukeAnimation(null)} />
      )}
    </div>
  )
}
