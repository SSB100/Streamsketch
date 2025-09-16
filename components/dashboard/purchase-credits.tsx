"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Coins, Zap } from "lucide-react"
import { PURCHASE_PACKAGES } from "@/lib/packages"
import { useWallet } from "@solana/wallet-adapter-react"
import { Connection, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { APP_WALLET_ADDRESS } from "@/lib/constants"
import { processCreditPurchase } from "@/app/actions"
import { toast } from "sonner"

export function PurchaseCredits() {
  const { publicKey, sendTransaction } = useWallet()
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  const handlePurchase = async (packageId: "small" | "large") => {
    if (!publicKey) {
      toast.error("Please connect your wallet first")
      return
    }

    setIsProcessing(packageId)

    try {
      const creditPackage = PURCHASE_PACKAGES[packageId]
      const rpcHost = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "https://api.devnet.solana.com"
      const connection = new Connection(rpcHost, "confirmed")

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

      // Wait for confirmation
      await connection.confirmTransaction({ signature, lastValidBlockHeight, blockhash })

      // Process the purchase on the backend
      const result = await processCreditPurchase(publicKey.toBase58(), signature, packageId)

      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.error)
      }
    } catch (error: any) {
      console.error("Purchase failed:", error)
      toast.error(`Purchase failed: ${error.message}`)
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Purchase Line Credits
        </CardTitle>
        <CardDescription>Buy line credits to draw on any session. Credits never expire.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(PURCHASE_PACKAGES).map((pkg) => (
            <Card key={pkg.id} className="relative">
              {pkg.isPopular && (
                <Badge className="absolute -top-2 left-4 bg-gradient-to-r from-purple-500 to-pink-500">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                <div className="text-2xl font-bold text-primary">{pkg.price} SOL</div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Line Credits</span>
                    <span className="font-medium">{pkg.lines}</span>
                  </div>
                </div>
                <Button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={!publicKey || isProcessing === pkg.id}
                  className="w-full"
                  variant={pkg.isPopular ? "default" : "outline"}
                >
                  {isProcessing === pkg.id ? (
                    <>
                      <Zap className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Coins className="mr-2 h-4 w-4" />
                      Purchase {pkg.lines} Credits
                    </>
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
