"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Coins, ExternalLink, Loader2 } from "lucide-react"
import { claimRevenueAction } from "@/app/actions"
import { toast } from "sonner"

interface RevenueManagerProps {
  unclaimedSol: number
  totalClaimedSol: number
  onClaimSuccess?: () => void
}

export function RevenueManager({ unclaimedSol, totalClaimedSol, onClaimSuccess }: RevenueManagerProps) {
  const { publicKey, connected } = useWallet()
  const [isLoading, setIsLoading] = useState(false)

  const handleClaim = async () => {
    if (!connected || !publicKey || unclaimedSol <= 0) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("walletAddress", publicKey.toBase58())

      const result = await claimRevenueAction(null, formData)

      if (result.success && result.signature) {
        // Show success toast with mainnet Solscan link
        toast.success(
          <div className="flex flex-col gap-2">
            <div className="font-medium">{result.message}</div>
            <a
              href={`https://solscan.io/tx/${result.signature}?cluster=mainnet-beta`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 underline"
            >
              View on Solscan <ExternalLink className="h-3 w-3" />
            </a>
          </div>,
          {
            duration: 10000,
          },
        )
        onClaimSuccess?.()
      } else {
        toast.error(result.message || "Failed to claim revenue")
      }
    } catch (error) {
      console.error("Claim error:", error)
      toast.error("An unexpected error occurred while claiming revenue")
    } finally {
      setIsLoading(false)
    }
  }

  const canClaim = connected && unclaimedSol > 0 && !isLoading

  return (
    <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-400">
          <Coins className="h-5 w-5" />
          Revenue Manager
        </CardTitle>
        <CardDescription>Manage your earned SOL from drawing sessions and nuke purchases</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Revenue Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Unclaimed SOL</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-green-400">{unclaimedSol.toFixed(6)}</p>
              <Badge variant="secondary" className="text-xs">
                SOL
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Claimed</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-white">{totalClaimedSol.toFixed(6)}</p>
              <Badge variant="outline" className="text-xs">
                SOL
              </Badge>
            </div>
          </div>
        </div>

        {/* Claim Button */}
        <div className="space-y-3">
          <Button
            onClick={handleClaim}
            disabled={!canClaim}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Claim...
              </>
            ) : (
              <>
                <Coins className="mr-2 h-4 w-4" />
                Claim {unclaimedSol.toFixed(6)} SOL
              </>
            )}
          </Button>

          {!connected && (
            <p className="text-sm text-muted-foreground text-center">Connect your wallet to claim revenue</p>
          )}

          {connected && unclaimedSol <= 0 && (
            <p className="text-sm text-muted-foreground text-center">No unclaimed revenue available</p>
          )}
        </div>

        {/* Revenue Info */}
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
          <h4 className="font-medium text-green-400 mb-2">How Revenue Works</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Earn SOL when viewers draw on your sessions</li>
            <li>• Earn SOL when viewers purchase nukes for your sessions</li>
            <li>• Revenue is automatically calculated and added to your balance</li>
            <li>• Claim your earnings anytime to your connected wallet</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
