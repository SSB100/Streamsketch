"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { History, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Transaction {
  id: string
  transaction_type: string
  sol_amount: number
  credit_amount?: number
  notes?: string
  created_at: string
  signature?: string
}

interface TransactionHistoryProps {
  transactions?: Transaction[]
}

export function TransactionHistory({ transactions = [] }: TransactionHistoryProps) {
  // Ensure we have a valid array and filter out any invalid entries
  const validTransactions = Array.isArray(transactions)
    ? transactions.filter((tx) => tx && tx.id && tx.transaction_type)
    : []

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "Invalid date"
    }
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "purchase_lines":
        return "bg-green-500/10 text-green-400 border-green-500/20"
      case "purchase_nuke":
        return "bg-red-500/10 text-red-400 border-red-500/20"
      case "claim_revenue":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20"
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "purchase_lines":
        return "Line Purchase"
      case "purchase_nuke":
        return "Nuke Purchase"
      case "claim_revenue":
        return "Revenue Claim"
      default:
        return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Transaction History
        </CardTitle>
        <CardDescription>Your recent blockchain transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {validTransactions.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {validTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getTransactionTypeColor(transaction.transaction_type)}>
                        {getTransactionTypeLabel(transaction.transaction_type)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{formatDate(transaction.created_at)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{(transaction.sol_amount || 0).toFixed(4)} SOL</span>
                      {transaction.credit_amount && (
                        <span className="text-muted-foreground ml-2">• {transaction.credit_amount} credits</span>
                      )}
                    </div>
                    {transaction.notes && <div className="text-xs text-muted-foreground mt-1">{transaction.notes}</div>}
                  </div>
                  {transaction.signature && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const explorerUrl = `https://explorer.solana.com/tx/${transaction.signature}?cluster=devnet`
                        window.open(explorerUrl, "_blank")
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No transactions yet</p>
            <p className="text-xs">Your transaction history will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
