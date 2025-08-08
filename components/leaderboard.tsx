"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, Crown } from 'lucide-react'
import { formatSol } from "@/lib/utils"
import { getLeaderboard } from "@/app/actions"
import { Skeleton } from "@/components/ui/skeleton"

type LeaderboardEntry = {
  rank: number
  wallet_address: string
  username: string | null
  total_earnings: number
  unclaimed_sol: number
  total_claimed_sol: number
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-400" />
    case 2:
      return <Trophy className="h-5 w-5 text-gray-300" />
    case 3:
      return <Medal className="h-5 w-5 text-amber-600" />
    default:
      return <Award className="h-5 w-5 text-muted-foreground" />
  }
}

const getRankBadgeVariant = (rank: number) => {
  switch (rank) {
    case 1:
      return "default"
    case 2:
      return "secondary"
    case 3:
      return "outline"
    default:
      return "outline"
  }
}

const formatWalletAddress = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getLeaderboard()
        setLeaderboard(data)
      } catch (err: any) {
        console.error("Failed to fetch leaderboard:", err)
        setError("Failed to load leaderboard data")
      } finally {
        setIsLoading(false)
      }
    }
    fetchLeaderboard()
  }, [])

  if (error) {
    return (
      <section id="leaderboard" className="py-12 md:py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tighter text-white sm:text-4xl">Leaderboard</h2>
            <p className="mt-4 text-muted-foreground">Top earning streamers on StreamSketch</p>
            <div className="mt-8">
              <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="p-6 text-center">
                  <p className="text-red-400">{error}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="leaderboard" className="py-12 md:py-16">
      <div className="container">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tighter text-white sm:text-4xl">Leaderboard</h2>
          <p className="mt-4 text-muted-foreground">Top earning streamers on StreamSketch</p>

          <div className="mt-8">
            <Card className="border-yellow-400/20 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  Top Streamers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : leaderboard.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-white">Rank</TableHead>
                        <TableHead className="text-white">Streamer</TableHead>
                        <TableHead className="text-white">Total Earnings</TableHead>
                        <TableHead className="text-white">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((entry) => (
                        <TableRow key={entry.wallet_address} className="border-border/20">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getRankIcon(entry.rank)}
                              <Badge variant={getRankBadgeVariant(entry.rank)}>#{entry.rank}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-white">{entry.username || "Anonymous"}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {formatWalletAddress(entry.wallet_address)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-yellow-400">{formatSol(entry.total_earnings)} SOL</span>
                              <div className="text-xs text-muted-foreground">
                                <span className="text-green-400">{formatSol(entry.total_claimed_sol)} claimed</span>
                                {entry.unclaimed_sol > 0 && (
                                  <>
                                    {" • "}
                                    <span className="text-yellow-400">{formatSol(entry.unclaimed_sol)} pending</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {entry.unclaimed_sol > 0 ? (
                              <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-400">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Claimed
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center">
                    <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium text-white">No earnings yet</h3>
                    <p className="mt-2 text-muted-foreground">
                      Be the first to earn SOL by hosting a StreamSketch session!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
