"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import {
  getUserData,
  getUserSessions,
  getTransactionHistory,
  getUserFreeCreditSessions,
  revalidatePath,
} from "@/app/actions"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { SessionManager } from "@/components/dashboard/session-manager"
import { TransactionHistory } from "@/components/dashboard/transaction-history"
import { ProfileManager } from "@/components/dashboard/profile-manager"
import { PurchaseCredits } from "@/components/dashboard/purchase-credits"
import { RewardManager } from "@/components/dashboard/reward-manager"
import { FreeCreditsDisplay } from "@/components/dashboard/free-credits-display"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { ErrorBoundary } from "@/components/error-boundary"

type UserData = Awaited<ReturnType<typeof getUserData>>
type SessionData = Awaited<ReturnType<typeof getUserSessions>>
type TransactionData = Awaited<ReturnType<typeof getTransactionHistory>>
type FreeCreditSessions = Awaited<ReturnType<typeof getUserFreeCreditSessions>>

function DashboardContent() {
  const { publicKey } = useWallet()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [sessions, setSessions] = useState<SessionData | null>(null)
  const [transactions, setTransactions] = useState<TransactionData | null>(null)
  const [freeCreditSessions, setFreeCreditSessions] = useState<FreeCreditSessions | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const lastRefreshTime = useRef(0)

  const refreshAllData = useCallback(async () => {
    if (!publicKey) return

    const now = Date.now()
    if (now - lastRefreshTime.current < 5000) {
      toast.info("Please wait a moment before refreshing again.")
      return
    }

    setIsRefreshing(true)
    lastRefreshTime.current = now

    try {
      await revalidatePath("/dashboard")
      const [ud, sd, td, fcsd] = await Promise.all([
        getUserData(publicKey.toBase58()),
        getUserSessions(publicKey.toBase58()),
        getTransactionHistory(publicKey.toBase58()),
        getUserFreeCreditSessions(publicKey.toBase58()),
      ])
      setUserData(ud)
      setSessions(sd)
      setTransactions(td)
      setFreeCreditSessions(fcsd)
      toast.success("Dashboard data refreshed!")
    } catch (error) {
      console.error("Failed to refresh data:", error)
      toast.error("Failed to refresh data. Please try again.")
    } finally {
      setIsRefreshing(false)
    }
  }, [publicKey])

  useEffect(() => {
    if (publicKey) {
      setIsLoading(true)
      Promise.all([
        getUserData(publicKey.toBase58()),
        getUserSessions(publicKey.toBase58()),
        getTransactionHistory(publicKey.toBase58()),
        getUserFreeCreditSessions(publicKey.toBase58()),
      ])
        .then(([ud, sd, td, fcsd]) => {
          setUserData(ud)
          setSessions(sd)
          setTransactions(td)
          setFreeCreditSessions(fcsd)
        })
        .catch((error) => {
          console.error("Failed to load initial dashboard data:", error)
          toast.error("Failed to load dashboard data.")
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
      setUserData(null)
      setSessions(null)
      setTransactions(null)
      setFreeCreditSessions(null)
    }
  }, [publicKey])

  if (isLoading) {
    return <div className="text-center p-10">Loading dashboard...</div>
  }

  if (!publicKey) {
    return <div className="text-center p-10">Please connect your wallet to view the dashboard.</div>
  }

  if (!userData) {
    return <div className="text-center p-10">Could not load user data. Please try refreshing.</div>
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Your Dashboard</h1>
        <Button onClick={refreshAllData} disabled={isRefreshing} size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <ProfileManager
        initialUsername={userData.username}
        walletAddress={publicKey.toBase58()}
        onProfileUpdate={refreshAllData}
      />

      <StatsCards
        lineCredits={userData.lineCredits}
        unclaimedSol={userData.unclaimedSol}
        totalClaimedSol={userData.totalClaimedSol}
        linesGifted={userData.linesGifted}
        nukesGifted={userData.nukesGifted}
        totalFreeLines={userData.totalFreeLines}
        totalFreeNukes={userData.totalFreeNukes}
      />

      {freeCreditSessions && freeCreditSessions.length > 0 && (
        <FreeCreditsDisplay freeCreditSessions={freeCreditSessions} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <SessionManager initialSessions={sessions || []} onSessionUpdate={refreshAllData} />
          <TransactionHistory initialTransactions={transactions || []} />
        </div>
        <div className="space-y-8">
          <PurchaseCredits onPurchaseSuccess={refreshAllData} />
          <RewardManager
            unclaimedSol={userData.unclaimedSol}
            walletAddress={publicKey.toBase58()}
            onClaimSuccess={refreshAllData}
          />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  )
}
