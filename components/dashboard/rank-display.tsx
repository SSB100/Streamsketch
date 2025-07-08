"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Crown, Medal, Award, TrendingUp } from "lucide-react"
import { formatSol } from "@/lib/utils"
import { getUserRank } from "@/app/actions"

type UserRank = {
  rank: number
  totalRevenue: number
  username: string
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-8 w-8 text-yellow-400" />
    case 2:
      return <Medal className="h-8 w-8 text-gray-300" />
    case 3:
      return <Award className="h-8 w-8 text-amber-600" />
    default:
      return <Trophy className="h-6 w-6 text-muted-foreground" />
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

const getRankMessage = (rank: number) => {
  if (rank <= 3) {
    return "🎉 You're in the top 3!"
  } else if (rank <= 10) {
    return "🔥 You're in the top 10!"
  } else if (rank <= 50) {
    return "📈 You're climbing the ranks!"
  } else {
    return "💪 Keep earning to climb higher!"
  }
}

export function RankDisplay() {
  const { publicKey } = useWallet()
  const [userRank, setUserRank] = useState<UserRank | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadUserRank() {
      if (!publicKey) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const rank = await getUserRank(publicKey.toBase58())
        setUserRank(rank)
      } catch (error) {
        console.error("Failed to load user rank:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadUserRank()
  }, [publicKey])

  if (!publicKey) {
    return null
  }

  if (isLoading) {
    return (
      <Card className="border-yellow-400/20 bg-gradient-to-r from-yellow-400/5 to-orange-400/5">
        <CardContent className="p-6">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!userRank) {
    return (
      <Card className="border-muted/20 bg-white/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center rounded-full bg-muted/10 p-3">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Not Ranked Yet</h3>
              <p className="text-sm text-muted-foreground">
                Start earning revenue to appear on the leaderboard! Set your username first.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={`border-yellow-400/20 ${userRank.rank <= 3 ? "bg-gradient-to-r from-yellow-400/10 to-orange-400/10" : "bg-white/5"}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {getRankIcon(userRank.rank)}
              <Badge className={`text-lg font-bold px-3 py-1 ${getRankBadgeColor(userRank.rank)}`}>
                #{userRank.rank}
              </Badge>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Your Leaderboard Rank</h3>
              <p className="text-sm text-muted-foreground">{getRankMessage(userRank.rank)}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-400">{formatSol(userRank.totalRevenue)} SOL</div>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
