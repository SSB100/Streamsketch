"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { SystemProgram, Transaction, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Rocket, Loader2, Wallet } from "lucide-react"
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
      const rpcHost = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST
      if (!rpcHost) {
        throw new Error("Solana RPC host is not configured.")
      }
      const connection = new Connection(rpcHost, "confirmed")

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

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed")
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
    <div className="space-y-4">
      {Object.values(PURCHASE_PACKAGES).map((pkg) => (
        <div
          key={pkg.id}
          className={cn(
            "relative rounded-lg border p-4 transition-all duration-200 hover:shadow-lg",
            pkg.isPopular
              ? "border-neon-pink/40 bg-neon-pink/5 shadow-neon-pink/10 hover:border-neon-pink/60 hover:shadow-neon-pink/20"
              : pkg.id === "starter"
                ? "border-blue-400/40 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 shadow-blue-400/10 hover:border-blue-400/60 hover:shadow-blue-400/20 hover:from-blue-500/15 hover:to-cyan-500/15"
                : pkg.id === "creator"
                  ? "border-purple-400/40 bg-gradient-to-br from-purple-500/10 to-pink-500/10 shadow-purple-400/10 hover:border-purple-400/60 hover:shadow-purple-400/20 hover:from-purple-500/15 hover:to-pink-500/15"
                  : "border-border/40 bg-deep-space/30 hover:border-border/60 hover:bg-deep-space/50",
          )}
        >
          {pkg.isPopular && (
            <div className="absolute -top-3 right-4 rounded-full bg-gradient-to-r from-neon-pink to-purple-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-neon-pink/30 animate-pulse border border-white/20">
              ✨ Most Popular
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4
                className={cn(
                  "font-semibold",
                  pkg.id === "starter"
                    ? "text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text"
                    : pkg.id === "creator"
                      ? "text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text"
                      : "text-white",
                )}
              >
                {pkg.name}
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">{formatSol(pkg.pricePerLine, 5)} SOL per line</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span
                  className={cn(
                    "text-2xl font-bold",
                    pkg.id === "starter"
                      ? "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                      : pkg.id === "creator"
                        ? "text-purple-400 drop-shadow-[0_0_8px_rgba(147,51,234,0.5)]"
                        : "text-neon-pink",
                  )}
                >
                  {pkg.lines}
                </span>
                <span className="text-sm text-gray-400">lines</span>
              </div>
            </div>

            <div className="ml-4 flex flex-col items-end gap-2">
              <div className="text-right">
                <div className="text-lg font-bold text-white">{pkg.price} SOL</div>
              </div>
              <Button
                onClick={() => handlePurchase(pkg)}
                disabled={!!isPurchasing || !publicKey}
                size="sm"
                className={cn(
                  "bg-neon-pink text-white hover:bg-neon-pink/90 font-semibold transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isPurchasing === pkg.id && "animate-pulse",
                )}
              >
                {isPurchasing === pkg.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Rocket className="mr-1 h-4 w-4" />
                    Buy Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ))}

      {!publicKey && (
        <div className="rounded-lg border border-border/40 bg-deep-space/30 p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <Wallet className="h-10 w-10 text-gray-400" />
            <p className="text-sm text-gray-400">Connect your wallet to purchase credits</p>
          </div>
        </div>
      )}
    </div>
  )
}
