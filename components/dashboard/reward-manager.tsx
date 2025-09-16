"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Gift, Users, Zap } from "lucide-react"
import { giftCreditsToSessionAction } from "@/app/actions"
import { toast } from "sonner"

interface RewardManagerProps {
  userSessions?: Array<{
    id: string
    short_code: string
    is_active: boolean
    is_free: boolean
  }>
  linesGifted?: number
  nukesGifted?: number
  walletAddress?: string
}

export function RewardManager({
  userSessions = [],
  linesGifted = 0,
  nukesGifted = 0,
  walletAddress = "",
}: RewardManagerProps) {
  const [selectedSession, setSelectedSession] = useState("")
  const [viewerWallet, setViewerWallet] = useState("")
  const [linesToGift, setLinesToGift] = useState(1)
  const [nukesToGift, setNukesToGift] = useState(0)
  const [isGifting, setIsGifting] = useState(false)

  // Ensure we have a valid array and filter out any invalid entries
  const validSessions = Array.isArray(userSessions)
    ? userSessions.filter((session) => session && session.short_code && session.is_active)
    : []

  const handleGiftCredits = async () => {
    if (!selectedSession || !viewerWallet || (!linesToGift && !nukesToGift)) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!walletAddress) {
      toast.error("Wallet not connected")
      return
    }

    setIsGifting(true)
    try {
      const result = await giftCreditsToSessionAction(
        walletAddress,
        selectedSession,
        viewerWallet,
        linesToGift,
        nukesToGift,
      )

      if (result.success) {
        toast.success("Credits gifted successfully!")
        setViewerWallet("")
        setLinesToGift(1)
        setNukesToGift(0)
      } else {
        toast.error(result.error || "Failed to gift credits")
      }
    } catch (error) {
      console.error("Error gifting credits:", error)
      toast.error("Failed to gift credits")
    } finally {
      setIsGifting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Reward Viewers
        </CardTitle>
        <CardDescription>Gift credits to viewers in your active sessions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{linesGifted || 0}</div>
            <div className="text-sm text-muted-foreground">Lines Gifted Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{nukesGifted || 0}</div>
            <div className="text-sm text-muted-foreground">Nukes Gifted Today</div>
          </div>
        </div>

        {validSessions.length > 0 ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="session-select">Select Session</Label>
              <select
                id="session-select"
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md bg-background"
              >
                <option value="">Choose a session...</option>
                {validSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.short_code} {session.is_free && "(Free)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="viewer-wallet">Viewer Wallet Address</Label>
              <Input
                id="viewer-wallet"
                type="text"
                placeholder="Enter viewer's wallet address"
                value={viewerWallet}
                onChange={(e) => setViewerWallet(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lines-to-gift">Lines to Gift</Label>
                <Input
                  id="lines-to-gift"
                  type="number"
                  min="0"
                  max="100"
                  value={linesToGift}
                  onChange={(e) => setLinesToGift(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="nukes-to-gift">Nukes to Gift</Label>
                <Input
                  id="nukes-to-gift"
                  type="number"
                  min="0"
                  max="10"
                  value={nukesToGift}
                  onChange={(e) => setNukesToGift(Number(e.target.value))}
                />
              </div>
            </div>

            <Button
              onClick={handleGiftCredits}
              disabled={isGifting || !selectedSession || !viewerWallet}
              className="w-full"
            >
              {isGifting ? (
                <>
                  <Zap className="mr-2 h-4 w-4 animate-spin" />
                  Gifting...
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Gift Credits
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active sessions</p>
            <p className="text-xs">Create an active session to gift credits to viewers</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
