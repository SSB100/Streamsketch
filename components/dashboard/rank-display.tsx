"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp, Users } from "lucide-react"
import { formatSol } from "@/lib/utils"
import { getUserRank } from "@/app/actions"

interface RankDisplayProps {
  totalEarnings: number
}

type UserRankData = {
  user_rank: number
  total_earnings: number
  total_users_with_earnings: number
}

export function RankDisplay({ totalEarnings }: RankDisplayProps) {
  const { publicKey } = useWallet()
  const [rankData, setRankData] = useState<UserRankData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRank = async () => {
      if (!publicKey) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const data = await getUserRank(publicKey.toBase58())
        setRankData(data)
      } catch (err) {
        console.error("Failed to fetch user rank:", err)
        setRankData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRank()
  }, [publicKey, totalEarnings])

  if (!publicKey || isLoading) {
    return (
      <Card className="border-border/20 bg-white/5">
        <CardContent className="flex h-[188px] items-center justify-center">
          <div className="h-8 w-1/2 animate-pulse rounded-md bg-white/10" />
        </CardContent>
      </Card>
    )
  }

  if (!rankData || rankData.user_rank === 0) {
    return (
      <Card className="border-border/20 bg-white/5">
        <CardContent className="flex h-[188px] flex-col items-center justify-center p-6 text-center">
          <Users className="h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">Your Rank</p>
          <div className="mt-1 text-4xl font-bold tracking-tighter text-white">Unranked</div>
          <p className="mt-4 text-sm text-muted-foreground">Start earning SOL to appear on the leaderboard.</p>
        </CardContent>
      </Card>
    )
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400 drop-shadow-[0_2px_4px_rgba(250,204,21,0.5)]"
    if (rank <= 3) return "text-orange-400 drop-shadow-[0_2px_4px_rgba(251,146,60,0.5)]"
    if (rank <= 10) return "text-green-400 drop-shadow-[0_2px_4px_rgba(74,222,128,0.5)]"
    return "text-blue-400"
  }

  return (
    <div className="rounded-lg bg-gradient-to-br from-primary/80 via-yellow-400/80 to-green-400/80 p-1 shadow-lg transition-all duration-300 hover:shadow-primary/40">
      <Card className="border-none bg-deep-space">
        <CardContent className="flex h-[188px] flex-col items-center justify-center p-6 text-center">
          <Trophy className="h-10 w-10 text-yellow-400 drop-shadow-[0_2px_4px_rgba(250,204,21,0.5)]" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">Your Rank</p>
          <div className="flex items-baseline gap-4">
            <div className={`text-6xl font-bold tracking-tighter ${getRankColor(rankData.user_rank)}`}>
              #{rankData.user_rank}
            </div>
            <div className="flex flex-col items-start">
              <p className="text-lg font-semibold text-white">{formatSol(rankData.total_earnings)} SOL</p>
              <p className="text-xs text-muted-foreground">of {rankData.total_users_with_earnings} streamers</p>
            </div>
          </div>

          {rankData.user_rank <= 10 && (
            <Badge variant="secondary" className="mt-2 bg-green-500/10 text-green-400 border-green-500/20">
              <TrendingUp className="mr-1 h-3 w-3" />
              Top 10!
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
