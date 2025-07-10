"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Connection, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PURCHASE_PACKAGES, type PurchasePackage } from "@/lib/packages"
import { processCreditPurchase } from "@/app/actions"
import { APP_WALLET_ADDRESS } from "@/lib/constants"
import { Loader2 } from "lucide-react"

const rpcHost = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST!
const connection = new Connection(rpcHost)

export function PurchaseCredits() {
  const { publicKey, sendTransaction } = useWallet()
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  const handlePurchase = async (pkg: PurchasePackage) => {
    if (!publicKey || !sendTransaction) {
      toast.error("Wallet not connected.", {
        description: "Please connect your wallet to purchase credits.",
      })
      return
    }

    setIsProcessing(pkg.id)

    try {
      toast.info("Preparing transaction...")
      // THE FIX: Get the latest blockhash before creating the transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

      const transaction = new Transaction({
        feePayer: publicKey,
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: APP_WALLET_ADDRESS,
          lamports: pkg.price * LAMPORTS_PER_SOL,
        }),
      )

      const signature = await sendTransaction(transaction, connection)
      toast.info("Transaction sent! Waiting for confirmation...", {
        description: "This may take a few seconds.",
      })

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "processed")

      toast.success("Transaction confirmed! Granting credits...")

      const result = await processCreditPurchase(publicKey.toBase58(), signature, pkg.id)

      if (result.success) {
        toast.success("Purchase successful!", {
          description: result.message,
        })
      } else {
        toast.error("Purchase failed on server.", {
          description: result.error,
        })
      }
    } catch (error: any) {
      console.error("Purchase failed:", error)
      toast.error("Purchase failed.", {
        description: error.message || "The transaction was not completed. Please try again.",
      })
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Line Credits (SOL)</CardTitle>
        <CardDescription>Select a package to top up your account using Solana.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.values(PURCHASE_PACKAGES).map((pkg) => (
          <div key={pkg.id} className="p-4 border rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold">{pkg.name}</h3>
              <p className="text-sm text-gray-400">{pkg.lines} Lines</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-lg font-bold">{pkg.price} SOL</div>
              <Button onClick={() => handlePurchase(pkg)} disabled={!publicKey || !!isProcessing}>
                {isProcessing === pkg.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isProcessing === pkg.id ? "Processing..." : "Purchase"}
              </Button>
            </div>
          </div>
        ))}
        {!publicKey && <p className="text-center text-sm text-yellow-400">Please connect your wallet to purchase.</p>}
      </CardContent>
    </Card>
  )
}
