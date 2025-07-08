"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Crown, Medal, Award } from "lucide-react"
import { formatSol } from "@/lib/utils"
import { getRevenueLeaderboard } from "@/app/actions"

type LeaderboardEntry = {
  username: string
  wallet_address: string
  total_revenue: number
  unclaimed_sol: number
  total_claimed_sol: number
  rank: number
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-6 w-6 text-yellow-400" />
    case 2:
      return <Medal className="h-6 w-6 text-gray-300" />
    case 3:
      return <Award className="h-6 w-6 text-amber-600" />
    default:
      return <Trophy className="h-5 w-5 text-muted-foreground" />
  }
}

const getRankBadgeColor = (rank: number) => {
  switch (rank) {
    case 1:
      return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black"
    case 2:
      return "bg-gradient-to-r from-gray-300 to-gray-500 text-black"
    case 3:
      return "bg-gradient-to-r from-amber-600 to-amber-800 text-white"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadLeaderboard() {
      setIsLoading(true)
      try {
        const data = await getRevenueLeaderboard(10)
        setLeaderboard(data)
      } catch (error) {
        console.error("Failed to load leaderboard:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadLeaderboard()
  }, [])

  if (isLoading) {
    return (
      <Card className="border-yellow-400/20 bg-gradient-to-br from-yellow-400/5 to-orange-400/5">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400/10">
            <Trophy className="h-8 w-8 text-yellow-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-white">Revenue Leaderboard</CardTitle>
          <CardDescription className="text-lg">Top earning streamers on StreamSketch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <Card className="border-yellow-400/20 bg-gradient-to-br from-yellow-400/5 to-orange-400/5">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400/10">
            <Trophy className="h-8 w-8 text-yellow-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-white">Revenue Leaderboard</CardTitle>
          <CardDescription className="text-lg">Top earning streamers on StreamSketch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No streamers have earned revenue yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Be the first to create a session and start earning!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-yellow-400/20 bg-gradient-to-br from-yellow-400/5 to-orange-400/5">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400/10">
          <Trophy className="h-8 w-8 text-yellow-400" />
        </div>
        <CardTitle className="text-3xl font-bold text-white">Revenue Leaderboard</CardTitle>
        <CardDescription className="text-lg">Top earning streamers on StreamSketch</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((entry) => (
            <div
              key={entry.wallet_address}
              className={`flex items-center justify-between rounded-lg p-4 transition-all hover:scale-[1.02] ${
                entry.rank <= 3
                  ? "border-2 border-yellow-400/30 bg-gradient-to-r from-yellow-400/10 to-transparent"
                  : "border border-border/20 bg-white/5"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {getRankIcon(entry.rank)}
                  <Badge className={`font-bold ${getRankBadgeColor(entry.rank)}`}>#{entry.rank}</Badge>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{entry.username}</h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {`${entry.wallet_address.slice(0, 4)}...${entry.wallet_address.slice(-4)}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-yellow-400">{formatSol(entry.total_revenue)} SOL</div>
                <div className="text-xs text-muted-foreground">
                  {entry.unclaimed_sol > 0 && (
                    <span className="text-orange-400">{formatSol(entry.unclaimed_sol)} unclaimed</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {leaderboard.length === 10 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Showing top 10 streamers • Set your username to appear on the leaderboard
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
