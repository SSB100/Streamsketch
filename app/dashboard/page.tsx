"use client"

import { useCallback, useRef } from "react"

import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Header } from "@/components/header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { PurchaseCredits } from "@/components/dashboard/purchase-credits"
import { SessionManager } from "@/components/dashboard/session-manager"
import { TransactionHistory } from "@/components/dashboard/transaction-history"
import { ProfileManager } from "@/components/dashboard/profile-manager"
import { getUserData, getUserSessions, getUserFreeCreditSessions } from "@/app/actions"
import { Skeleton } from "@/components/ui/skeleton"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { toast } from "sonner"
import { RewardManager } from "@/components/dashboard/reward-manager"
import { ErrorBoundary } from "@/components/error-boundary"
import { FreeCreditsDisplay } from "@/components/dashboard/free-credits-display"

type UserData = {
  lineCredits: number
  unclaimedSol: number
  totalClaimedSol: number
  username: string | null
  linesGifted: number
  nukesGifted: number
  totalFreeLines: number
  totalFreeNukes: number
  sessions: Session[]
  freeCreditSessions: Array<{
    session_id: string
    session_code: string
    free_lines: number
    free_nukes: number
    granted_at: string
  }>
}

type Session = {
  id: string
  short_code: string
  is_active: boolean
  created_at: string
}

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
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const lastRefreshTimeRef = useRef(0)

  const refreshAllData = useCallback(
    async (force = false) => {
      if (!publicKey) return

      // Prevent too-frequent refreshes (≥ 5 s)
      const now = Date.now()
      if (!force && now - lastRefreshTimeRef.current < 5000) {
        console.log("[Dashboard] Skipping refresh - too soon since last refresh")
        return
      }
      lastRefreshTimeRef.current = now

      setHasError(false)

      try {
        console.log("[Dashboard] Starting data refresh for", publicKey.toBase58().slice(0, 8))
        const startTime = performance.now()

        const [data, userSessions, freeCreditSessions] = await Promise.allSettled([
          getUserData(publicKey.toBase58()),
          getUserSessions(publicKey.toBase58()),
          getUserFreeCreditSessions(publicKey.toBase58()),
        ])

        const totalTime = performance.now() - startTime
        console.log(`[Dashboard] Data refresh completed in ${totalTime.toFixed(2)}ms`)

        if (data.status === "fulfilled") {
          const baseUserData = data.value
          const sessions = userSessions.status === "fulfilled" ? userSessions.value : []
          const freeCredits = freeCreditSessions.status === "fulfilled" ? freeCreditSessions.value : []

          setUserData({
            ...baseUserData,
            sessions,
            freeCreditSessions: freeCredits,
          })
          setSessions(sessions)
        } else {
          console.error("Failed to load user data:", data.reason)
          toast.error("Could not load your account data. Some features may not work correctly.")
          setUserData({
            lineCredits: 0,
            unclaimedSol: 0,
            totalClaimedSol: 0,
            username: null,
            linesGifted: 0,
            nukesGifted: 0,
            totalFreeLines: 0,
            totalFreeNukes: 0,
            sessions: [],
            freeCreditSessions: [],
          })
          setSessions([])
        }
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
      setHasError(false)
      return
    }

    setIsLoading(true)
    refreshAllData(true).finally(() => setIsLoading(false))
  }, [connected, publicKey, connecting, refreshAllData])

  // Optimized refresh function that doesn't force refresh
  const handleRefresh = useCallback(() => refreshAllData(false), [refreshAllData])

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
              <FreeCreditsDisplay freeCreditSessions={userData.freeCreditSessions} />
              <ProfileManager initialUsername={userData.username} />
              <RewardManager
                linesGifted={userData.linesGifted}
                nukesGifted={userData.nukesGifted}
                userSessions={userData.sessions}
                onGiftSuccess={handleRefresh}
              />
              <PurchaseCredits onPurchaseSuccess={handleRefresh} />
              <SessionManager initialSessions={sessions} />
              <TransactionHistory />
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
