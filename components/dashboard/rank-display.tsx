"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp, Users, Crown, Medal, Award } from "lucide-react"
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
      <div className="flex h-[240px] items-center justify-center">
        <div className="h-8 w-1/2 animate-pulse rounded-md bg-white/10" />
      </div>
    )
  }

  if (!rankData || rankData.user_rank === 0) {
    return (
      <div className="flex h-[240px] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-500/10">
          <Users className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Unranked</h3>
        <p className="text-sm text-muted-foreground">
          Start earning SOL to appear on the leaderboard and compete with other creators.
        </p>
      </div>
    )
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return Crown
    if (rank <= 3) return Medal
    if (rank <= 10) return Award
    return Trophy
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400 drop-shadow-[0_2px_8px_rgba(250,204,21,0.6)]"
    if (rank <= 3) return "text-orange-400 drop-shadow-[0_2px_8px_rgba(251,146,60,0.6)]"
    if (rank <= 10) return "text-green-400 drop-shadow-[0_2px_8px_rgba(74,222,128,0.6)]"
    return "text-blue-400 drop-shadow-[0_2px_8px_rgba(96,165,250,0.6)]"
  }

  const getRankGradient = (rank: number) => {
    if (rank === 1) return "from-yellow-400/20 via-yellow-400/10 to-transparent"
    if (rank <= 3) return "from-orange-400/20 via-orange-400/10 to-transparent"
    if (rank <= 10) return "from-green-400/20 via-green-400/10 to-transparent"
    return "from-blue-400/20 via-blue-400/10 to-transparent"
  }

  const RankIcon = getRankIcon(rankData.user_rank)

  return (
    <div
      className={`rounded-lg bg-gradient-to-br ${getRankGradient(rankData.user_rank)} p-1 shadow-lg transition-all duration-300 hover:shadow-xl`}
    >
      <div className="rounded-lg bg-deep-space/90 backdrop-blur-sm">
        <div className="flex h-[240px] flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-white/5">
            <RankIcon className={`h-8 w-8 ${getRankColor(rankData.user_rank)}`} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Your Rank</p>
            <div className={`text-4xl font-bold tracking-tighter ${getRankColor(rankData.user_rank)}`}>
              #{rankData.user_rank}
            </div>

            <div className="space-y-1">
              <p className="text-lg font-semibold text-white">{formatSol(rankData.total_earnings)} SOL</p>
              <p className="text-xs text-muted-foreground">of {rankData.total_users_with_earnings} streamers</p>
            </div>
          </div>

          {rankData.user_rank <= 10 && (
            <Badge
              variant="secondary"
              className="mt-4 bg-green-500/10 text-green-400 border-green-500/20 font-semibold"
            >
              <TrendingUp className="mr-1 h-3 w-3" />
              Top 10!
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
