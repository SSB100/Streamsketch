"use client"

import type React from "react"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { giftCreditsToSessionAction } from "@/app/actions"
import { Loader2, Gift } from "lucide-react"

interface RewardManagerProps {
  linesGifted: number
  nukesGifted: number
  userSessions: Array<{ id: string; short_code: string }>
  onGiftSuccess?: () => void // Add callback prop
}

export function RewardManager({ linesGifted, nukesGifted, userSessions, onGiftSuccess }: RewardManagerProps) {
  const { publicKey } = useWallet()
  const [viewerWallet, setViewerWallet] = useState("")
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [lines, setLines] = useState(0)
  const [nukes, setNukes] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey) {
      toast.error("Wallet not connected.")
      return
    }
    if (!selectedSessionId) {
      toast.error("Please select a session.")
      return
    }
    setIsLoading(true)
    try {
      const result = await giftCreditsToSessionAction(
        publicKey.toBase58(),
        selectedSessionId,
        viewerWallet,
        lines,
        nukes,
      )
      if (result.success) {
        toast.success(result.message || "Credits gifted successfully!")
        setViewerWallet("")
        setSelectedSessionId("")
        setLines(0)
        setNukes(0)
        // Call the callback to refresh dashboard data
        onGiftSuccess?.()
      } else {
        toast.error("Failed to gift credits", { description: result.error })
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred", { description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border/20 bg-white/5">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-white">Reward Viewers</CardTitle>
            <CardDescription>
              Gift free lines and nukes to your community for specific sessions. Credits are tied to the session and
              will be deleted if the session is removed.
            </CardDescription>
          </div>
          <div className="flex-shrink-0 text-right text-sm">
            <p className="text-muted-foreground">Weekly Gifts Sent</p>
            <p className="font-mono text-white">
              {linesGifted} / 100 <span className="text-muted-foreground">Lines</span>
            </p>
            <p className="font-mono text-white">
              {nukesGifted} / 10 <span className="text-muted-foreground">Nukes</span>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid items-center gap-1.5">
              <Label htmlFor="viewerWallet" className="text-white">
                Viewer's Wallet Address
              </Label>
              <Input
                id="viewerWallet"
                type="text"
                placeholder="Enter viewer's Solana wallet address"
                value={viewerWallet}
                onChange={(e) => setViewerWallet(e.target.value)}
                required
              />
            </div>
            <div className="grid items-center gap-1.5">
              <Label htmlFor="session" className="text-white">
                Session
              </Label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a session" />
                </SelectTrigger>
                <SelectContent>
                  {userSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.short_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="lines" className="text-white">
                Lines
              </Label>
              <Input
                id="lines"
                type="number"
                placeholder="0"
                value={lines || ""}
                onChange={(e) => setLines(Number.parseInt(e.target.value, 10) || 0)}
                min="0"
                max="100"
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="nukes" className="text-white">
                Nukes
              </Label>
              <Input
                id="nukes"
                type="number"
                placeholder="0"
                value={nukes || ""}
                onChange={(e) => setNukes(Number.parseInt(e.target.value, 10) || 0)}
                min="0"
                max="10"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isLoading || !publicKey || (!lines && !nukes) || !selectedSessionId}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gift className="mr-2 h-4 w-4" />}
                Gift Credits
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
