"use client"

import { useState } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Rocket, Loader2, Zap } from "lucide-react"
import { PURCHASE_PACKAGES } from "@/lib/packages"
import { processCreditPurchase } from "@/app/actions"
import { toast } from "sonner"
import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js"
import { APP_WALLET_ADDRESS } from "@/lib/constants"

interface PurchaseCreditsProps {
  onPurchaseSuccess?: () => void
}

export function PurchaseCredits({ onPurchaseSuccess }: PurchaseCreditsProps) {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [purchasingPackage, setPurchasingPackage] = useState<string | null>(null)

  const handlePurchase = async (packageId: keyof typeof PURCHASE_PACKAGES) => {
    if (!publicKey || !sendTransaction) {
      toast.error("Please connect your wallet first.")
      return
    }

    const creditPackage = PURCHASE_PACKAGES[packageId]
    setPurchasingPackage(packageId)

    try {
      // Create transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      const transaction = new Transaction({
        feePayer: publicKey,
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: APP_WALLET_ADDRESS,
          lamports: Math.floor(creditPackage.price * LAMPORTS_PER_SOL),
        }),
      )

      // Send transaction
      const signature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction({ signature, lastValidBlockHeight, blockhash })

      // Process the purchase on the backend
      const result = await processCreditPurchase(publicKey.toBase58(), signature, packageId)

      if (result.success) {
        toast.success("Purchase successful!", {
          description: result.message,
          action: {
            label: "View on Solscan",
            onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, "_blank"),
          },
        })
        onPurchaseSuccess?.()
      } else {
        toast.error("Purchase failed", { description: result.error })
      }
    } catch (error: any) {
      console.error("Purchase failed:", error)
      toast.error("Purchase failed", { description: error.message || "Transaction was cancelled or failed." })
    } finally {
      setPurchasingPackage(null)
    }
  }

  return (
    <Card className="border-border/20 bg-white/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <CardTitle className="text-white">Purchase Line Credits</CardTitle>
        </div>
        <CardDescription>Buy credits to draw on any whiteboard. Credits never expire.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(PURCHASE_PACKAGES).map(([id, pkg]) => (
            <Card key={id} className="border-border/50 bg-background/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">{pkg.name}</h3>
                  {pkg.popular && <Badge className="bg-primary text-primary-foreground">Popular</Badge>}
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">{pkg.lines} line credits</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{pkg.price} SOL</div>
                  <div className="text-xs text-muted-foreground">~${(pkg.price * 100).toFixed(2)} USD</div>
                </div>
                <Button
                  onClick={() => handlePurchase(id as keyof typeof PURCHASE_PACKAGES)}
                  disabled={!publicKey || purchasingPackage === id}
                  className="w-full"
                  variant={pkg.popular ? "default" : "outline"}
                >
                  {purchasingPackage === id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Buy ${pkg.lines} Credits`
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
