"use client"

import type React from "react"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Gift, Loader2, Paintbrush, Bomb } from "lucide-react"
import { giftCreditsToSessionAction } from "@/app/actions"
import { toast } from "sonner"

type Session = {
  id: string
  short_code: string
  is_active: boolean
  created_at: string
}

interface RewardManagerProps {
  linesGifted: number
  nukesGifted: number
  userSessions: Session[]
  onGiftSuccess?: () => void
}

export function RewardManager({ linesGifted, nukesGifted, userSessions, onGiftSuccess }: RewardManagerProps) {
  const { publicKey } = useWallet()
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [viewerWallet, setViewerWallet] = useState("")
  const [linesToGift, setLinesToGift] = useState(0)
  const [nukesToGift, setNukesToGift] = useState(0)
  const [isGifting, setIsGifting] = useState(false)

  const activeSessions = userSessions.filter((session) => session.is_active)

  const handleGiftCredits = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey) {
      toast.error("Please connect your wallet first.")
      return
    }

    if (!selectedSessionId) {
      toast.error("Please select a session.")
      return
    }

    if (!viewerWallet.trim()) {
      toast.error("Please enter a viewer wallet address.")
      return
    }

    if (linesToGift <= 0 && nukesToGift <= 0) {
      toast.error("Please specify at least one credit to gift.")
      return
    }

    setIsGifting(true)
    try {
      const result = await giftCreditsToSessionAction(
        publicKey.toBase58(),
        selectedSessionId,
        viewerWallet.trim(),
        linesToGift,
        nukesToGift,
      )

      if (result.success) {
        toast.success("Credits gifted successfully!", { description: result.message })
        setViewerWallet("")
        setLinesToGift(0)
        setNukesToGift(0)
        setSelectedSessionId("")
        onGiftSuccess?.()
      } else {
        toast.error("Failed to gift credits", { description: result.error })
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred", { description: error.message })
    } finally {
      setIsGifting(false)
    }
  }

  return (
    <Card className="border-border/20 bg-white/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <CardTitle className="text-white">Reward Viewers</CardTitle>
        </div>
        <CardDescription>
          Gift free credits to your viewers. You've gifted {linesGifted} lines and {nukesGifted} nukes today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeSessions.length === 0 ? (
          <p className="text-center text-muted-foreground">
            You need at least one active session to gift credits to viewers.
          </p>
        ) : (
          <form onSubmit={handleGiftCredits} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="session" className="text-white">
                  Select Session
                </Label>
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Choose a session" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.short_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="viewer-wallet" className="text-white">
                  Viewer Wallet Address
                </Label>
                <Input
                  id="viewer-wallet"
                  value={viewerWallet}
                  onChange={(e) => setViewerWallet(e.target.value)}
                  placeholder="Enter viewer's wallet address"
                  disabled={isGifting}
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lines-to-gift" className="text-white flex items-center gap-2">
                  <Paintbrush className="h-4 w-4" />
                  Lines to Gift
                </Label>
                <Input
                  id="lines-to-gift"
                  type="number"
                  min="0"
                  max="10"
                  value={linesToGift}
                  onChange={(e) => setLinesToGift(Number.parseInt(e.target.value) || 0)}
                  disabled={isGifting}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nukes-to-gift" className="text-white flex items-center gap-2">
                  <Bomb className="h-4 w-4" />
                  Nukes to Gift
                </Label>
                <Input
                  id="nukes-to-gift"
                  type="number"
                  min="0"
                  max="5"
                  value={nukesToGift}
                  onChange={(e) => setNukesToGift(Number.parseInt(e.target.value) || 0)}
                  disabled={isGifting}
                  className="bg-background/50"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={
                !publicKey ||
                isGifting ||
                !selectedSessionId ||
                !viewerWallet.trim() ||
                (linesToGift <= 0 && nukesToGift <= 0)
              }
              className="w-full"
            >
              {isGifting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gift Credits
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
