"use client"

import { useCallback, useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Header } from "@/components/header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { RankDisplay } from "@/components/dashboard/rank-display"
import { PurchaseCredits } from "@/components/dashboard/purchase-credits"
import { SessionManager } from "@/components/dashboard/session-manager"
import { TransactionHistory } from "@/components/dashboard/transaction-history"
import { ProfileManager } from "@/components/dashboard/profile-manager"
import { getUserData, getUserSessions, getUserFreeCreditSessions, getStreamerAd } from "@/app/actions"
import { Skeleton } from "@/components/ui/skeleton"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { toast } from "sonner"
import { RewardManager } from "@/components/dashboard/reward-manager"
import { ErrorBoundary } from "@/components/error-boundary"
import { FreeCreditsDisplay } from "@/components/dashboard/free-credits-display"
import { AdManager } from "@/components/dashboard/ad-manager"
import type { Advertisement } from "@/lib/types"

// Define the types for our state
type UserData = {
  lineCredits: number
  unclaimedSol: number
  totalClaimedSol: number
  username: string | null
  linesGifted: number
  nukesGifted: number
  totalFreeLines: number
  totalFreeNukes: number
}

type Session = {
  id: string
  short_code: string
  is_active: boolean
  created_at: string
}

type FreeCreditSession = {
  session_id: string
  session_code: string
  free_lines: number
  free_nukes: number
  granted_at: string
}

// A skeleton component for the loading state
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-[125px] w-full" /> {/* Rank Display */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-[125px] w-full" />
        <Skeleton className="h-[125px] w-full" />
        <Skeleton className="h-[125px] w-full" />
        <Skeleton className="h-[125px] w-full" />
      </div>
      <Skeleton className="h-[160px] w-full" /> {/* Placeholder for Free Credits Display */}
      <Skeleton className="h-[120px] w-full" /> {/* Profile Manager */}
      <Skeleton className="h-[280px] w-full" /> {/* Reward Manager */}
      <Skeleton className="h-[300px] w-full" /> {/* Purchase Credits */}
      <Skeleton className="h-[400px] w-full" /> {/* Session Manager */}
      <Skeleton className="h-[400px] w-full" /> {/* Ad Manager */}
      <Skeleton className="h-[400px] w-full" /> {/* Transaction History */}
    </div>
  )
}

// The main content component for the dashboard
function DashboardContent() {
  const { connected, publicKey, connecting } = useWallet()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [freeCreditSessions, setFreeCreditSessions] = useState<FreeCreditSession[]>([])
  const [customAd, setCustomAd] = useState<Advertisement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const refreshAllData = useCallback(async () => {
    if (!publicKey) return

    setHasError(false)
    try {
      // Fetch all data in parallel for a faster load
      const [dataResult, sessionsResult, freeCreditsResult, adResult] = await Promise.allSettled([
        getUserData(publicKey.toBase58()),
        getUserSessions(publicKey.toBase58()),
        getUserFreeCreditSessions(publicKey.toBase58()),
        getStreamerAd(publicKey.toBase58()),
      ])

      // Process user data
      if (dataResult.status === "fulfilled") {
        setUserData(dataResult.value)
      } else {
        console.error("Failed to load user data:", dataResult.reason)
        toast.error("Could not load your account data.")
        setUserData(null) // Clear stale data on error
        throw new Error("Failed to load user data")
      }

      // Process sessions
      if (sessionsResult.status === "fulfilled") {
        setSessions(sessionsResult.value)
      } else {
        console.error("Failed to load sessions:", sessionsResult.reason)
        setSessions([])
      }

      // Process free credit sessions
      if (freeCreditsResult.status === "fulfilled") {
        setFreeCreditSessions(freeCreditsResult.value)
      } else {
        console.error("Failed to load free credits:", freeCreditsResult.reason)
        setFreeCreditSessions([])
      }

      // Process ad data
      if (adResult.status === "fulfilled") {
        setCustomAd(adResult.value)
      } else {
        console.error("Failed to load ad data:", adResult.reason)
        setCustomAd(null)
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
      setHasError(true)
      toast.error("Could not load your dashboard. Please try refreshing.")
    }
  }, [publicKey])

  useEffect(() => {
    if (connecting) {
      setIsLoading(true)
      return
    }

    if (!connected || !publicKey) {
      setIsLoading(false)
      setUserData(null)
      setSessions([])
      setFreeCreditSessions([])
      setCustomAd(null)
      setHasError(false)
      return
    }

    setIsLoading(true)
    refreshAllData().finally(() => setIsLoading(false))
  }, [connected, publicKey, connecting, refreshAllData])

  // Render error state
  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-red-500/50 bg-red-500/5 py-24 text-center">
        <h2 className="text-2xl font-bold text-white">Failed to Load Dashboard</h2>
        <p className="mt-2 text-muted-foreground">There was an error loading your dashboard data.</p>
        <button
          onClick={() => {
            setHasError(false)
            setIsLoading(true)
            refreshAllData().finally(() => setIsLoading(false))
          }}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Render loading or disconnected state
  if (isLoading || connecting) {
    return <DashboardSkeleton />
  }

  if (!connected || !userData) {
    return (
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
    )
  }

  // Render the full dashboard
  return (
    <div className="flex flex-col gap-8">
      <RankDisplay totalEarnings={userData.unclaimedSol + userData.totalClaimedSol} />
      <StatsCards
        lineCredits={userData.lineCredits}
        unclaimedSol={userData.unclaimedSol}
        totalClaimedSol={userData.totalClaimedSol}
        totalFreeLines={userData.totalFreeLines}
        totalFreeNukes={userData.totalFreeNukes}
        onClaimSuccess={refreshAllData}
      />
      <FreeCreditsDisplay freeCreditSessions={freeCreditSessions} />
      <ProfileManager initialUsername={userData.username} />
      <RewardManager
        linesGifted={userData.linesGifted}
        nukesGifted={userData.nukesGifted}
        userSessions={sessions}
        onGiftSuccess={refreshAllData}
      />
      <PurchaseCredits onPurchaseSuccess={refreshAllData} />
      <SessionManager initialSessions={sessions} onSessionUpdate={refreshAllData} />
      <AdManager initialAd={customAd} />
      <TransactionHistory />
    </div>
  )
}

// The page component itself, which wraps the content in providers and layout
export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <Header />
      <main className="flex-1">
        <div className="container py-8">
          <h1 className="mb-6 text-3xl font-bold tracking-tighter text-white">Dashboard</h1>
          <DashboardContent />
        </div>
      </main>
    </ErrorBoundary>
  )
}
