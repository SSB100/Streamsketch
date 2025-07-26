"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getTransactionHistory } from "@/app/actions"
import { formatSol } from "@/lib/utils"
import { ArrowUpRight, ArrowDownLeft, Rocket, Bomb, CircleDollarSign, Copy, ExternalLink, Filter } from "lucide-react"
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
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")

  useEffect(() => {
    async function loadTransactions() {
      if (publicKey) {
        setIsLoading(true)
        try {
          const data = await getTransactionHistory(publicKey.toBase58())
          setTransactions(data)
          setFilteredTransactions(data)
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

  useEffect(() => {
    let filtered = [...transactions]

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter((tx) => tx.transaction_type === typeFilter)
    }

    // Filter by date
    if (dateFilter !== "all") {
      const now = new Date()
      const filterDate = new Date()

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0)
          filtered = filtered.filter((tx) => new Date(tx.created_at) >= filterDate)
          break
        case "week":
          filterDate.setDate(now.getDate() - 7)
          filtered = filtered.filter((tx) => new Date(tx.created_at) >= filterDate)
          break
        case "month":
          filterDate.setMonth(now.getMonth() - 1)
          filtered = filtered.filter((tx) => new Date(tx.created_at) >= filterDate)
          break
      }
    }

    setFilteredTransactions(filtered)
  }, [transactions, typeFilter, dateFilter])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Signature copied to clipboard!")
  }

  const uniqueTypes = Array.from(new Set(transactions.map((tx) => tx.transaction_type)))

  if (!publicKey) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-400">Filters:</span>
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-deep-space/50 border-border/40 text-white">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="bg-deep-space border-border/40">
              <SelectItem value="all" className="text-white hover:bg-deep-space/70">
                All Types
              </SelectItem>
              {uniqueTypes.map((type) => {
                const { label } = getTransactionDetails(type)
                return (
                  <SelectItem key={type} value={type} className="text-white hover:bg-deep-space/70">
                    {label}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-deep-space/50 border-border/40 text-white">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent className="bg-deep-space border-border/40">
              <SelectItem value="all" className="text-white hover:bg-deep-space/70">
                All Time
              </SelectItem>
              <SelectItem value="today" className="text-white hover:bg-deep-space/70">
                Today
              </SelectItem>
              <SelectItem value="week" className="text-white hover:bg-deep-space/70">
                Last 7 Days
              </SelectItem>
              <SelectItem value="month" className="text-white hover:bg-deep-space/70">
                Last 30 Days
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-gray-400">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>
      </div>

      {/* Transaction Table with Scrolling */}
      <div className="max-h-80 overflow-y-auto rounded-md border border-border/40 bg-deep-space/30">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-gray-800" />
            ))}
          </div>
        ) : filteredTransactions.length > 0 ? (
          <Table>
            <TableHeader className="sticky top-0 bg-deep-space/90 backdrop-blur-sm">
              <TableRow className="border-border/40">
                <TableHead className="text-white">Type</TableHead>
                <TableHead className="text-white">Amount</TableHead>
                <TableHead className="text-white">Date</TableHead>
                <TableHead className="text-white">Signature / Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((tx) => {
                const { icon, label, variant } = getTransactionDetails(tx.transaction_type)
                return (
                  <TableRow key={tx.id} className="border-border/40 hover:bg-deep-space/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {icon}
                        <Badge variant={variant}>{label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-white">{formatSol(tx.sol_amount)} SOL</TableCell>
                    <TableCell className="text-white">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {tx.signature ? (
                        <div className="flex items-center gap-2 font-mono text-sm">
                          <span className="text-white">{`${tx.signature.slice(0, 6)}...${tx.signature.slice(-6)}`}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-deep-space/70"
                            onClick={() => copyToClipboard(tx.signature!)}
                          >
                            <Copy className="h-3 w-3 text-gray-400" />
                          </Button>
                          <Link
                            href={`https://solscan.io/tx/${tx.signature}?cluster=mainnet-beta`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-deep-space/70">
                              <ExternalLink className="h-3 w-3 text-gray-400" />
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
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CircleDollarSign className="h-12 w-12 text-gray-600 mb-4" />
            <p className="text-gray-400">
              {typeFilter !== "all" || dateFilter !== "all"
                ? "No transactions match your filters"
                : "No transactions yet"}
            </p>
            {(typeFilter !== "all" || dateFilter !== "all") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setTypeFilter("all")
                  setDateFilter("all")
                }}
                className="mt-2 text-neon-pink hover:bg-deep-space/50"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
