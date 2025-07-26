"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Gift, Paintbrush, Bomb, Users } from "lucide-react"
import { toast } from "sonner"
import { giftCreditsToSessionAction } from "@/app/actions"

interface Session {
  id: string
  short_code: string
  is_active: boolean
  created_at: string
}

interface RewardManagerProps {
  linesGifted: number
  nukesGifted: number
  userSessions: Session[]
  onGiftSuccess: () => void
}

export function RewardManager({ linesGifted, nukesGifted, userSessions, onGiftSuccess }: RewardManagerProps) {
  const [selectedSession, setSelectedSession] = useState<string>("")
  const [viewerWallet, setViewerWallet] = useState("")
  const [linesToGift, setLinesToGift] = useState(1)
  const [nukesToGift, setNukesToGift] = useState(0)
  const [isGifting, setIsGifting] = useState(false)

  const handleGiftCredits = async () => {
    if (!selectedSession || !viewerWallet.trim()) {
      toast.error("Please select a session and enter a viewer wallet address")
      return
    }

    if (linesToGift <= 0 && nukesToGift <= 0) {
      toast.error("Please specify at least one credit to gift")
      return
    }

    setIsGifting(true)
    try {
      const result = await giftCreditsToSessionAction(
        "", // Owner wallet will be determined from session
        Number.parseInt(selectedSession),
        viewerWallet.trim(),
        linesToGift,
        nukesToGift,
      )

      if (result.success) {
        toast.success(result.message || "Credits gifted successfully!")
        setViewerWallet("")
        setLinesToGift(1)
        setNukesToGift(0)
        onGiftSuccess()
      } else {
        toast.error(result.error || "Failed to gift credits")
      }
    } catch (error) {
      console.error("Gift credits error:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsGifting(false)
    }
  }

  const activeSessions = userSessions.filter((session) => session.is_active)

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/20 bg-deep-space/50">
          <CardContent className="flex items-center justify-between p-3">
            <div className="flex items-center space-x-2 min-w-0">
              <Paintbrush className="h-4 w-4 text-blue-400 shrink-0" />
              <span className="text-sm text-muted-foreground truncate">Lines Gifted</span>
            </div>
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20 shrink-0">
              {linesGifted}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-border/20 bg-deep-space/50">
          <CardContent className="flex items-center justify-between p-3">
            <div className="flex items-center space-x-2 min-w-0">
              <Bomb className="h-4 w-4 text-red-400 shrink-0" />
              <span className="text-sm text-muted-foreground truncate">Nukes Gifted</span>
            </div>
            <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20 shrink-0">
              {nukesGifted}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Gift Form */}
      <Card className="border-border/20 bg-deep-space/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-white">
            <Gift className="h-5 w-5 text-neon-pink shrink-0" />
            <span className="truncate">Gift Credits to Viewer</span>
          </CardTitle>
          <CardDescription className="text-sm">Send free credits to any viewer on your active sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {activeSessions.length === 0 ? (
            <div className="text-center py-6">
              <Users className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">No active sessions available</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create and activate a session to start gifting credits
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-select" className="text-sm font-medium text-white">
                  Select Session
                </Label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger className="bg-deep-space/70 border-border/40 text-white">
                    <SelectValue placeholder="Choose an active session" />
                  </SelectTrigger>
                  <SelectContent className="bg-deep-space border-border/40">
                    {activeSessions.map((session) => (
                      <SelectItem key={session.id} value={session.id} className="text-white hover:bg-deep-space/70">
                        {session.short_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="viewer-wallet" className="text-sm font-medium text-white">
                  Viewer Wallet Address
                </Label>
                <Input
                  id="viewer-wallet"
                  placeholder="Enter viewer's wallet address"
                  value={viewerWallet}
                  onChange={(e) => setViewerWallet(e.target.value)}
                  className="bg-deep-space/70 border-border/40 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="lines-to-gift" className="text-sm font-medium text-white">
                    Line Credits
                  </Label>
                  <Input
                    id="lines-to-gift"
                    type="number"
                    min="0"
                    max="100"
                    value={linesToGift}
                    onChange={(e) => setLinesToGift(Number.parseInt(e.target.value) || 0)}
                    className="bg-deep-space/70 border-border/40 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nukes-to-gift" className="text-sm font-medium text-white">
                    Nuke Credits
                  </Label>
                  <Input
                    id="nukes-to-gift"
                    type="number"
                    min="0"
                    max="10"
                    value={nukesToGift}
                    onChange={(e) => setNukesToGift(Number.parseInt(e.target.value) || 0)}
                    className="bg-deep-space/70 border-border/40 text-white"
                  />
                </div>
              </div>

              <Button
                onClick={handleGiftCredits}
                disabled={isGifting || !selectedSession || !viewerWallet.trim()}
                className="w-full bg-neon-pink hover:bg-neon-pink/90 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGifting ? "Gifting..." : "Gift Credits"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
