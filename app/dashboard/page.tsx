import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { SessionManager } from "@/components/dashboard/session-manager"
import { TransactionHistory } from "@/components/dashboard/transaction-history"
import { RevenueManager } from "@/components/dashboard/revenue-manager"
import { PurchaseCredits } from "@/components/dashboard/purchase-credits"
import { ProfileManager } from "@/components/dashboard/profile-manager"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { FreeCreditsDisplay } from "@/components/dashboard/free-credits-display"
import { RankDisplay } from "@/components/dashboard/rank-display"
import { AdManager } from "@/components/dashboard/ad-manager"

async function getDashboardData(userId: string) {
  const supabase = createServerClient()

  // Get user profile and stats
  const { data: profile } = await supabase.from("users").select("*").eq("id", userId).single()

  // Get revenue data
  const { data: revenueData } = await supabase.rpc("get_user_revenue", { user_id: userId })

  // Get user stats
  const { data: stats } = await supabase.rpc("get_user_stats", { user_id: userId })

  // Get user rank
  const { data: rankData } = await supabase.rpc("get_user_rank", { user_id: userId })

  return {
    profile,
    revenue: revenueData || { unclaimed_sol: 0, total_claimed_sol: 0 },
    stats: stats || { total_drawings: 0, total_nukes: 0, total_sessions: 0 },
    rank: rankData || { rank: null, total_users: 0 },
  }
}

export default async function DashboardPage() {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const dashboardData = await getDashboardData(user.id)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-300">Manage your StreamSketch account and view your performance.</p>
        </div>

        <div className="grid gap-6">
          {/* Profile and Rank */}
          <div className="grid md:grid-cols-2 gap-6">
            <ProfileManager user={dashboardData.profile} />
            <RankDisplay rank={dashboardData.rank.rank} totalUsers={dashboardData.rank.total_users} />
          </div>

          {/* Stats Cards */}
          <StatsCards
            totalDrawings={dashboardData.stats.total_drawings}
            totalNukes={dashboardData.stats.total_nukes}
            totalSessions={dashboardData.stats.total_sessions}
          />

          {/* Revenue and Credits */}
          <div className="grid md:grid-cols-2 gap-6">
            <RevenueManager
              unclaimedSol={dashboardData.revenue.unclaimed_sol}
              totalClaimedSol={dashboardData.revenue.total_claimed_sol}
            />
            <FreeCreditsDisplay />
          </div>

          {/* Purchase Credits */}
          <PurchaseCredits />

          {/* Session Management */}
          <SessionManager />

          {/* Ad Management */}
          <AdManager />

          {/* Transaction History */}
          <Suspense fallback={<div className="text-white">Loading transactions...</div>}>
            <TransactionHistory />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
