"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SessionManager } from "@/components/dashboard/session-manager"
import { PurchaseCredits } from "@/components/dashboard/purchase-credits"
import { TransactionHistory } from "@/components/dashboard/transaction-history"
import { FreeCreditsDisplay } from "@/components/dashboard/free-credits-display"
import { RewardManager } from "@/components/dashboard/reward-manager"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { ProfileManager } from "@/components/dashboard/profile-manager"
import { RankDisplay } from "@/components/dashboard/rank-display"
import { getUserData, getUserSessions, getTransactionHistory, getUserFreeCreditSessions } from "@/app/actions"
import { Wallet, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface UserData {
  lineCredits: number
  username: string | null
  totalSpent: number
  totalEarned: number
  unclaimedSol: number
  totalClaimedSol: number
  linesGifted: number
  nukesGifted: number
  totalFreeLines: number
  totalFreeNukes: number
}

interface Session {
  id: string
  short_code: string
  is_active: boolean
  created_at: string
}

interface Transaction {
  id: string
  type: string
  amount: number
  created_at: string
  description: string
}

interface FreeCreditSession {
  session_id: string
  session_code: string
  free_lines: number
  free_nukes: number
  granted_at: string
}

export default function DashboardPage() {
  const { publicKey, connected } = useWallet()
  const router = useRouter()

  const [userData, setUserData] = useState<UserData>({
    lineCredits: 0,
    username: null,
    totalSpent: 0,
    totalEarned: 0,
    unclaimedSol: 0,
    totalClaimedSol: 0,
    linesGifted: 0,
    nukesGifted: 0,
    totalFreeLines: 0,
    totalFreeNukes: 0,
  })
  const [sessions, setSessions] = useState<Session[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [freeCreditSessions, setFreeCreditSessions] = useState<FreeCreditSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const refreshData = async () => {
    if (!publicKey) return

    setRefreshing(true)
    setError(null)

    try {
      const walletAddress = publicKey.toBase58()

      // Use Promise.allSettled to handle individual failures gracefully
      const [userResult, sessionsResult, transactionsResult, freeCreditResult] = await Promise.allSettled([
        getUserData(walletAddress),
        getUserSessions(walletAddress),
        getTransactionHistory(walletAddress),
        getUserFreeCreditSessions(walletAddress),
      ])

      // Handle user data
      if (userResult.status === "fulfilled") {
        setUserData(userResult.value)
      } else {
        console.error("Failed to load user data:", userResult.reason)
        toast.error("Failed to load user data")
      }

      // Handle sessions
      if (sessionsResult.status === "fulfilled") {
        setSessions(sessionsResult.value)
      } else {
        console.error("Failed to load sessions:", sessionsResult.reason)
        toast.error("Failed to load sessions")
      }

      // Handle transactions
      if (transactionsResult.status === "fulfilled") {
        setTransactions(transactionsResult.value)
      } else {
        console.error("Failed to load transactions:", transactionsResult.reason)
        toast.error("Failed to load transaction history")
      }

      // Handle free credit sessions
      if (freeCreditResult.status === "fulfilled") {
        setFreeCreditSessions(freeCreditResult.value)
      } else {
        console.error("Failed to load free credit sessions:", freeCreditResult.reason)
        // Don't show error toast for this as it's not critical
      }
    } catch (err) {
      console.error("Dashboard refresh error:", err)
      setError("Failed to load dashboard data")
      toast.error("Failed to refresh dashboard")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (connected && publicKey) {
      refreshData()
    } else {
      setLoading(false)
      setUserData({
        lineCredits: 0,
        username: null,
        totalSpent: 0,
        totalEarned: 0,
        unclaimedSol: 0,
        totalClaimedSol: 0,
        linesGifted: 0,
        nukesGifted: 0,
        totalFreeLines: 0,
        totalFreeNukes: 0,
      })
      setSessions([])
      setTransactions([])
      setFreeCreditSessions([])
    }
  }, [connected, publicKey])

  // Show wallet connection prompt if not connected
  if (!connected || !publicKey) {
    return (
      <div className="min-h-screen bg-deep-space text-white">
        <div className="container mx-auto px-6 lg:px-8 py-8 max-w-none">
          <div className="flex min-h-[60vh] items-center justify-center">
            <Card className="w-full max-w-md border-border/40 bg-deep-space/50 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neon-pink/10 border border-neon-pink/20">
                  <Wallet className="h-8 w-8 text-neon-pink" />
                </div>
                <CardTitle className="text-2xl text-white">Connect Your Wallet</CardTitle>
                <CardDescription className="text-gray-400">
                  Please connect your Solana wallet to access your dashboard and start creating sessions
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  onClick={() => router.push("/")}
                  className="w-full bg-neon-pink hover:bg-neon-pink/90 text-black font-semibold"
                >
                  Go to Home Page
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-deep-space text-white">
        <div className="container mx-auto px-6 lg:px-8 py-8 max-w-none">
          <div className="mb-8 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 bg-gray-800" />
              <Skeleton className="h-4 w-64 bg-gray-800" />
            </div>
            <Skeleton className="h-10 w-24 bg-gray-800" />
          </div>

          <div className="space-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-border/40 bg-deep-space/50">
                <CardHeader>
                  <Skeleton className="h-6 w-32 bg-gray-800" />
                  <Skeleton className="h-4 w-48 bg-gray-800" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full bg-gray-800" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-deep-space text-white">
      <div className="container mx-auto px-6 lg:px-8 py-8 max-w-none">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400">
              {userData.username ? `Welcome back, ${userData.username}` : "Manage your StreamSketch account"}
            </p>
          </div>
          <Button
            onClick={refreshData}
            disabled={refreshing}
            variant="outline"
            className="border-border/40 bg-deep-space/50 text-white hover:bg-deep-space/70 transition-colors"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-500/50 bg-red-500/10 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stacked Layout */}
        <div className="space-y-6">
          {/* Stats Cards */}
          <Card className="border-border/40 bg-deep-space/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-white">Account Overview</CardTitle>
              <CardDescription className="text-gray-400">Your credits, earnings, and activity summary</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <StatsCards
                lineCredits={userData.lineCredits}
                unclaimedSol={userData.unclaimedSol}
                totalClaimedSol={userData.totalClaimedSol}
                totalFreeLines={userData.totalFreeLines}
                totalFreeNukes={userData.totalFreeNukes}
                onClaimSuccess={refreshData}
              />
            </CardContent>
          </Card>

          {/* Free Credits Display */}
          {freeCreditSessions.length > 0 && <FreeCreditsDisplay freeCreditSessions={freeCreditSessions} />}

          {/* Profile & Rank Combined */}
          <Card className="border-border/40 bg-deep-space/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-white">Profile & Ranking</CardTitle>
              <CardDescription className="text-gray-400">
                Manage your profile and view your leaderboard position
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Profile Settings</h3>
                  <ProfileManager initialUsername={userData.username} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Your Rank</h3>
                  <RankDisplay totalEarnings={userData.unclaimedSol + userData.totalClaimedSol} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Management */}
          <Card className="border-border/40 bg-deep-space/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-white">Session Management</CardTitle>
              <CardDescription className="text-gray-400">Create and manage your drawing sessions</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Debug: Log sessions data */}
              {process.env.NODE_ENV === "development" && console.log("Dashboard sessions:", sessions)}
              <SessionManager key={sessions.length} initialSessions={sessions} onSessionUpdate={refreshData} />
            </CardContent>
          </Card>

          {/* Credits & Gifting Combined */}
          <Card className="border-border/40 bg-deep-space/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-white">Credits & Rewards</CardTitle>
              <CardDescription className="text-gray-400">
                Purchase credits and gift them to your viewers
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Purchase Credits</h3>
                  <PurchaseCredits onPurchaseSuccess={refreshData} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Gift Credits</h3>
                  <RewardManager
                    linesGifted={userData.linesGifted}
                    nukesGifted={userData.nukesGifted}
                    userSessions={sessions}
                    onGiftSuccess={refreshData}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card className="border-border/40 bg-deep-space/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-white">Transaction History</CardTitle>
              <CardDescription className="text-gray-400">Your recent purchases, earnings, and activity</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <TransactionHistory />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
