"use client"

import { useState } from "react"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Rocket, Loader2 } from "lucide-react"
import { APP_WALLET_ADDRESS } from "@/lib/constants"
import { processCreditPurchase } from "@/app/actions"
import { PURCHASE_PACKAGES, type CreditPackage } from "@/lib/packages"
import { formatSol } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface PurchaseCreditsProps {
  onPurchaseSuccess?: () => void
}

export function PurchaseCredits({ onPurchaseSuccess }: PurchaseCreditsProps) {
  const { publicKey, sendTransaction, wallet } = useWallet()
  const { connection } = useConnection()
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null)

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!publicKey || !wallet || !sendTransaction) {
      toast.error("Wallet not fully connected.", {
        description: "Please try disconnecting and reconnecting your wallet.",
      })
      return
    }

    setIsPurchasing(pkg.id)
    try {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed")
      const transaction = new Transaction({ feePayer: publicKey, blockhash, lastValidBlockHeight }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: APP_WALLET_ADDRESS,
          lamports: pkg.price * LAMPORTS_PER_SOL,
        }),
      )

      const signature = await sendTransaction(transaction, connection)
      toast.info("Transaction sent! Awaiting confirmation...")

      const confirmation = await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed",
      )

      if (confirmation.value.err) {
        throw new Error(`On-chain transaction failed: ${JSON.stringify(confirmation.value.err)}`)
      }

      toast.success("Transaction confirmed! Updating credits...")

      const result = await processCreditPurchase(publicKey.toBase58(), signature, pkg.id)
      if (result.success) {
        toast.success(result.message)
        onPurchaseSuccess?.()
      } else {
        toast.error("Credit update failed. Please contact support.", {
          description: `${result.error} (Signature: ${signature}). Please provide this signature to support.`,
          duration: 10000,
        })
      }
    } catch (error: any) {
      console.error("Purchase failed", error)
      toast.error("Purchase failed", { description: error.message, duration: 6000 })
    } finally {
      setIsPurchasing(null)
    }
  }

  return (
    <Card className="border-none bg-transparent shadow-none">
      <CardHeader>
        <CardTitle className="text-white">Purchase Line Credits</CardTitle>
        <CardDescription>Top up your account to keep the creativity flowing.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:items-stretch">
          {Object.values(PURCHASE_PACKAGES).map((pkg) => (
            <div
              key={pkg.id}
              className={cn(
                "relative flex flex-1 flex-col justify-between rounded-lg border bg-white/5 p-6 transition-all",
                pkg.isPopular
                  ? "border-yellow-400/40 shadow-lg shadow-yellow-400/10 hover:border-yellow-400/60"
                  : "border-primary/20 hover:border-primary/40",
              )}
            >
              {pkg.isPopular && (
                <div className="absolute -top-3 right-4 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-black">
                  Most Popular
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{formatSol(pkg.pricePerLine, 5)} SOL per line</p>
                <div className="my-4">
                  <span className={`text-4xl font-bold text-primary`}>{pkg.lines}</span>
                  <span className="ml-2 text-lg text-muted-foreground">lines</span>
                </div>
              </div>
              <Button
                onClick={() => handlePurchase(pkg)}
                disabled={!!isPurchasing || !publicKey}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isPurchasing === pkg.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="mr-2 h-4 w-4" />
                )}
                Purchase for {pkg.price} SOL
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
