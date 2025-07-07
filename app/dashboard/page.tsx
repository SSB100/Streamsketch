"use client"

import { useCallback, useRef, useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Header } from "@/components/header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { PurchaseCredits } from "@/components/dashboard/purchase-credits"
import { SessionManager } from "@/components/dashboard/session-manager"
import { TransactionHistory } from "@/components/dashboard/transaction-history"
import { ProfileManager } from "@/components/dashboard/profile-manager"
import {
  getUserData,
  getUserSessions,
  getUserFreeCreditSessions,
  getTransactionHistory,
  revalidateDashboardAction,
} from "@/app/actions"
import { Skeleton } from "@/components/ui/skeleton"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { toast } from "sonner"
import { RewardManager } from "@/components/dashboard/reward-manager"
import { ErrorBoundary } from "@/components/error-boundary"
import { FreeCreditsDisplay } from "@/components/dashboard/free-credits-display"

type UserData = Awaited<ReturnType<typeof getUserData>>
type Session = Awaited<ReturnType<typeof getUserSessions>>[0]
type Transaction = Awaited<ReturnType<typeof getTransactionHistory>>[0]
type FreeCreditSession = Awaited<ReturnType<typeof getUserFreeCreditSessions>>[0]

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Skeleton className="h-[125px] w-full" />
        <Skeleton className="h-[125px] w-full" />
        <Skeleton className="h-[125px] w-full" />
        <Skeleton className="h-[125px] w-full" />
        <Skeleton className="h-[125px] w-full" />
      </div>
      <Skeleton className="h-[160px] w-full" />
      <Skeleton className="h-[280px] w-full" />
      <Skeleton className="h-[300px] w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
}

function DashboardContent() {
  const { connected, publicKey, connecting } = useWallet()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [freeCreditSessions, setFreeCreditSessions] = useState<FreeCreditSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const lastRefreshTimeRef = useRef(0)

  const refreshAllData = useCallback(
    async (force = false) => {
      if (!publicKey) return

      const now = Date.now()
      if (!force && now - lastRefreshTimeRef.current < 5000) {
        console.log("[Dashboard] Skipping refresh - too soon since last refresh")
        return
      }
      lastRefreshTimeRef.current = now
      setHasError(false)

      try {
        console.log("[Dashboard] Starting data refresh for", publicKey.toBase58().slice(0, 8))
        await revalidateDashboardAction() // Use the server action

        const [data, userSessions, freeCreditSessionsData, transactionsData] = await Promise.all([
          getUserData(publicKey.toBase58()),
          getUserSessions(publicKey.toBase58()),
          getUserFreeCreditSessions(publicKey.toBase58()),
          getTransactionHistory(publicKey.toBase58()),
        ])

        setUserData(data)
        setSessions(userSessions)
        setFreeCreditSessions(freeCreditSessionsData)
        setTransactions(transactionsData)
      } catch (error) {
        console.error("Failed to load dashboard data:", error)
        setHasError(true)
        toast.error("Could not load your dashboard data. Please try refreshing the page.")
      }
    },
    [publicKey],
  )

  useEffect(() => {
    if (connecting) {
      setIsLoading(true)
      return
    }

    if (!connected || !publicKey) {
      setIsLoading(false)
      setUserData(null)
      setSessions([])
      setTransactions([])
      setFreeCreditSessions([])
      setHasError(false)
      return
    }

    setIsLoading(true)
    refreshAllData(true).finally(() => setIsLoading(false))
  }, [connected, publicKey, connecting, refreshAllData])

  const handleRefresh = useCallback(() => {
    toast.info("Refreshing data...")
    refreshAllData(true)
  }, [refreshAllData])

  if (hasError) {
    return (
      <div className="container py-8">
        <h1 className="mb-6 text-3xl font-bold tracking-tighter text-white">Dashboard</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-red-500/50 bg-red-500/5 py-24 text-center">
          <h2 className="text-2xl font-bold text-white">Failed to Load Dashboard</h2>
          <p className="mt-2 text-muted-foreground">There was an error loading your dashboard data.</p>
          <button
            onClick={() => {
              setHasError(false)
              setIsLoading(true)
              refreshAllData(true).finally(() => setIsLoading(false))
            }}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="flex-1">
      <div className="container py-8">
        {isLoading || connecting ? (
          <>
            <h1 className="mb-6 text-3xl font-bold tracking-tighter text-white">Dashboard</h1>
            <DashboardSkeleton />
          </>
        ) : connected && userData ? (
          <>
            <h1 className="mb-6 text-3xl font-bold tracking-tighter text-white">Dashboard</h1>
            <div className="flex flex-col gap-8">
              <StatsCards
                lineCredits={userData.lineCredits}
                unclaimedSol={userData.unclaimedSol}
                totalClaimedSol={userData.totalClaimedSol}
                totalFreeLines={userData.totalFreeLines}
                totalFreeNukes={userData.totalFreeNukes}
                onClaimSuccess={handleRefresh}
              />
              <FreeCreditsDisplay freeCreditSessions={freeCreditSessions} />
              <ProfileManager initialUsername={userData.username} onProfileUpdate={handleRefresh} />
              <RewardManager
                linesGifted={userData.linesGifted}
                nukesGifted={userData.nukesGifted}
                userSessions={sessions}
                onGiftSuccess={handleRefresh}
              />
              <PurchaseCredits onPurchaseSuccess={handleRefresh} />
              <SessionManager initialSessions={sessions} onSessionUpdate={handleRefresh} />
              <TransactionHistory initialTransactions={transactions} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/50 bg-white/5 py-24 text-center">
            <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
            <p className="mt-2 text-muted-foreground">Please connect your wallet to access your dashboard.</p>
            <div className="mt-6">
              <WalletMultiButton
                style={{
                  backgroundColor: "#F000B8",
                  color: "#fff",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  height: "50px",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <Header />
      <DashboardContent />
    </ErrorBoundary>
  )
}
