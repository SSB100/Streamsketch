"use client"

import { Button } from "@/components/ui/button"

import { useState } from "react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

type Transaction = {
  id: string
  transaction_type: string
  sol_amount: number | null
  credit_amount: number | null
  notes: string | null
  created_at: string
  signature: string | null
}

interface TransactionHistoryProps {
  initialTransactions: Transaction[]
}

function TransactionSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  )
}

export function TransactionHistory({ initialTransactions }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [isLoading, setIsLoading] = useState(false)

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "purchase_lines":
        return "default"
      case "purchase_nuke":
        return "secondary"
      case "claim_revenue":
        return "success"
      case "gift_sent":
        return "warning"
      case "gift_received":
        return "info"
      default:
        return "outline"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Your recent account activity.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TransactionSkeleton />
        ) : transactions.length === 0 ? (
          <p className="text-center text-muted-foreground">No transactions yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Date</TableHead>
                <TableHead className="text-right">Explorer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <Badge variant={getBadgeVariant(tx.transaction_type)}>
                      {tx.transaction_type.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{tx.notes}</p>
                    <p className="text-sm text-muted-foreground">
                      {tx.sol_amount && `${tx.sol_amount.toFixed(4)} SOL`}
                      {tx.sol_amount && tx.credit_amount && " / "}
                      {tx.credit_amount && `${tx.credit_amount} credits`}
                    </p>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {tx.signature ? (
                      <Link
                        href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="icon" variant="ghost">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
