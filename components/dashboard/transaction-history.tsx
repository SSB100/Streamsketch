"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

const TRANSACTIONS_PER_PAGE = 20

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
    case "draw_line_free":
      return {
        icon: <ArrowUpRight className="h-4 w-4 text-green-400" />,
        label: "Drew Line (Free)",
        variant: "outline" as BadgeProps["variant"],
      }
    case "nuke_board":
      return {
        icon: <ArrowUpRight className="h-4 w-4 text-red-400" />,
        label: "Nuked Board",
        variant: "destructive" as BadgeProps["variant"],
      }
    case "nuke_board_free":
      return {
        icon: <ArrowUpRight className="h-4 w-4 text-cyan-400" />,
        label: "Nuked Board (Free)",
        variant: "outline" as BadgeProps["variant"],
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

const TRANSACTION_FILTERS = [
  { value: "all", label: "All Transactions" },
  { value: "purchase_lines", label: "Line Purchases" },
  { value: "purchase_nuke", label: "Nuke Purchases" },
  { value: "draw_line", label: "Line Drawings" },
  { value: "draw_line_free", label: "Free Line Drawings" },
  { value: "nuke_board", label: "Board Nukes" },
  { value: "nuke_board_free", label: "Free Board Nukes" },
  { value: "claim_revenue", label: "Revenue Claims" },
]

export function TransactionHistory() {
  const { publicKey } = useWallet()
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedFilter, setSelectedFilter] = useState("all")

  useEffect(() => {
    async function loadTransactions() {
      if (publicKey) {
        setIsLoading(true)
        try {
          const data = await getTransactionHistory(publicKey.toBase58())
          setAllTransactions(data)
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

  // Filter transactions when filter changes
  useEffect(() => {
    if (selectedFilter === "all") {
      setFilteredTransactions(allTransactions)
    } else {
      setFilteredTransactions(allTransactions.filter((tx) => tx.transaction_type === selectedFilter))
    }
    setCurrentPage(1) // Reset to first page when filter changes
  }, [selectedFilter, allTransactions])

  const totalPages = Math.ceil(filteredTransactions.length / TRANSACTIONS_PER_PAGE)
  const startIndex = (currentPage - 1) * TRANSACTIONS_PER_PAGE
  const endIndex = startIndex + TRANSACTIONS_PER_PAGE
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Signature copied to clipboard!")
  }

  if (!publicKey) {
    return null
  }

  const renderTransactionTable = (transactions: Transaction[]) => (
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
                    <Link href={`https://solscan.io/tx/${tx.signature}`} target="_blank" rel="noopener noreferrer">
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
  )

  const renderPaginationTabs = () => {
    if (totalPages <= 1) return null

    const tabs = []
    const maxVisibleTabs = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisibleTabs / 2))
    const endPage = Math.min(totalPages, startPage + maxVisibleTabs - 1)

    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisibleTabs) {
      startPage = Math.max(1, endPage - maxVisibleTabs + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      tabs.push(
        <TabsTrigger
          key={i}
          value={i.toString()}
          onClick={() => setCurrentPage(i)}
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          {i}
        </TabsTrigger>,
      )
    }

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length}{" "}
          transactions
        </div>
        <Tabs value={currentPage.toString()} className="w-auto">
          <TabsList className="grid grid-flow-col auto-cols-max">
            {startPage > 1 && (
              <>
                <TabsTrigger value="1" onClick={() => setCurrentPage(1)}>
                  1
                </TabsTrigger>
                {startPage > 2 && <span className="px-2 text-muted-foreground">...</span>}
              </>
            )}
            {tabs}
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="px-2 text-muted-foreground">...</span>}
                <TabsTrigger value={totalPages.toString()} onClick={() => setCurrentPage(totalPages)}>
                  {totalPages}
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </Tabs>
      </div>
    )
  }

  return (
    <Card className="border-border/20 bg-white/5">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-white">Transaction History</CardTitle>
            <CardDescription>Your recent purchases, drawings, and earnings.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter transactions" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredTransactions.length > 0 ? (
          <>
            {renderTransactionTable(currentTransactions)}
            {renderPaginationTabs()}
          </>
        ) : selectedFilter === "all" ? (
          <p className="text-center text-muted-foreground">No transactions yet.</p>
        ) : (
          <p className="text-center text-muted-foreground">No transactions found for the selected filter.</p>
        )}
      </CardContent>
    </Card>
  )
}
