"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Rocket, CircleDollarSign, Loader2, Trophy, Gift, Bomb } from "lucide-react"
import { formatSol } from "@/lib/utils"
import { claimRevenueAction } from "@/app/actions"
import { toast } from "sonner"

interface StatsCardsProps {
  lineCredits: number
  unclaimedSol: number
  totalClaimedSol: number
  totalFreeLines: number
  totalFreeNukes: number
  onClaimSuccess?: () => void
}

export function StatsCards({
  lineCredits,
  unclaimedSol,
  totalClaimedSol,
  totalFreeLines,
  totalFreeNukes,
  onClaimSuccess,
}: StatsCardsProps) {
  const { publicKey } = useWallet()
  const [isClaiming, setIsClaiming] = useState(false)

  const handleClaim = async () => {
    if (!publicKey || unclaimedSol <= 0) return
    setIsClaiming(true)
    try {
      const result = await claimRevenueAction(publicKey.toBase58())
      if (result.success) {
        toast.success("Claim Successful!", {
          description: result.message,
          action: result.signature
            ? {
                label: "View on Solscan",
                onClick: () => window.open(`https://solscan.io/tx/${result.signature}?cluster=devnet`, "_blank"),
              }
            : undefined,
        })
        onClaimSuccess?.()
      } else {
        toast.error("Claim Failed", { description: result.error })
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred", { description: error.message })
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card className="border-primary/20 bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Paid Line Credits</CardTitle>
          <Rocket className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{lineCredits}</div>
          <p className="text-xs text-muted-foreground">Credits you've purchased</p>
        </CardContent>
      </Card>
      <Card className="border-green-400/20 bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Free Line Credits</CardTitle>
          <Gift className="h-4 w-4 text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{totalFreeLines}</div>
          <p className="text-xs text-muted-foreground">Gifted by streamers</p>
        </CardContent>
      </Card>
      <Card className="border-cyan-400/20 bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Free Nuke Credits</CardTitle>
          <Bomb className="h-4 w-4 text-cyan-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{totalFreeNukes}</div>
          <p className="text-xs text-muted-foreground">Gifted by streamers</p>
        </CardContent>
      </Card>
      <Card className="border-yellow-400/20 bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Unclaimed Revenue</CardTitle>
          <CircleDollarSign className="h-4 w-4 text-yellow-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{formatSol(unclaimedSol)} SOL</div>
          <Button
            size="sm"
            className="mt-2 w-full bg-yellow-400 text-black hover:bg-yellow-400/90"
            disabled={isClaiming || unclaimedSol <= 0}
            onClick={handleClaim}
          >
            {isClaiming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Claim Revenue
          </Button>
        </CardContent>
      </Card>
      <Card className="border-green-400/20 bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Claimed</CardTitle>
          <Trophy className="h-4 w-4 text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{formatSol(totalClaimedSol)} SOL</div>
          <p className="text-xs text-muted-foreground">Your lifetime earnings</p>
        </CardContent>
      </Card>
    </div>
  )
}
