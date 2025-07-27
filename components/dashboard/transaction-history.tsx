"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getTransactionHistory } from "@/app/actions"
import { formatSol } from "@/lib/utils"
import { ArrowUpRight, ArrowDownLeft, Rocket, Bomb, CircleDollarSign, Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

type Transaction = {
  id: number
  transaction_type: string
  sol_amount: number
  credit_amount: number | null
  notes: string | null
  created_at: string
  signature: string | null
}

const getTransactionDetails = (type: string) => {
  switch (type) {
    case "purchase_lines":
      return {
        icon: <Rocket className="h-4 w-4 text-neon-pink" />,
        label: "Purchased Lines",
        variant: "secondary" as BadgeProps["variant"],
      }
    case "purchase_nuke":
      return {
        icon: <Bomb className="h-4 w-4 text-neon-cyan" />,
        label: "Purchased Nuke",
        variant: "secondary" as BadgeProps["variant"],
      }
    case "draw_line":
      return {
        icon: <ArrowUpRight className="h-4 w-4 text-orange-400" />,
        label: "Drew Line",
        variant: "destructive" as BadgeProps["variant"],
      }
    case "nuke_board":
      return {
        icon: <ArrowUpRight className="h-4 w-4 text-red-400" />,
        label: "Nuked Board",
        variant: "destructive" as BadgeProps["variant"],
      }
    case "claim_revenue":
      return {
        icon: <ArrowDownLeft className="h-4 w-4 text-green-400" />,
        label: "Claimed Revenue",
        variant: "default" as BadgeProps["variant"],
      }
    default:
      return {
        icon: <CircleDollarSign className="h-4 w-4 text-gray-400" />,
        label: type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        variant: "outline" as BadgeProps["variant"],
      }
  }
}

export function TransactionHistory() {
  const { publicKey } = useWallet()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadTransactions() {
      if (publicKey) {
        setIsLoading(true)
        try {
          const data = await getTransactionHistory(publicKey.toBase58())
          setTransactions(data)
        } catch (error) {
          console.error("Failed to load transaction history:", error)
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }
    loadTransactions()
  }, [publicKey])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Signature copied to clipboard!")
  }

  if (!publicKey) {
    return null
  }

  return (
    <Card className="border-border/20 bg-white/5">
      <CardHeader>
        <CardTitle className="text-white">Transaction History</CardTitle>
        <CardDescription>Your recent purchases, drawings, and earnings.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : transactions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-white">Type</TableHead>
                <TableHead className="text-white">Amount</TableHead>
                <TableHead className="text-white">Date</TableHead>
                <TableHead className="text-white">Signature / Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const { icon, label, variant } = getTransactionDetails(tx.transaction_type)
                return (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {icon}
                        <Badge variant={variant}>{label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{formatSol(tx.sol_amount)} SOL</TableCell>
                    <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {tx.signature ? (
                        <div className="flex items-center gap-2 font-mono text-sm">
                          <span>{`${tx.signature.slice(0, 6)}...${tx.signature.slice(-6)}`}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(tx.signature!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Link
                            href={`https://solscan.io/tx/${tx.signature}?cluster=mainnet-beta`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">{tx.notes || "-"}</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground">No transactions yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
