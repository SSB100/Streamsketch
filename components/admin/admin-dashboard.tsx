"use client"

import type React from "react"
import { useEffect, useState, useActionState } from "react"
import { getAdminDashboardData, adminWithdrawAction } from "@/app/admin/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { formatSol } from "@/lib/utils"
import { Landmark, BarChart, Users, Coins, AlertTriangle, Banknote } from "lucide-react"

interface AdminData {
  streamer_unclaimed: number
  streamer_claimed: number
  streamer_total: number
  platform_total_earnings: number
  platform_total_withdrawn: number
  platform_available_for_withdrawal: number
  platform_fees_paid: number
}

const initialState = {
  success: false,
  message: "",
  signature: "",
  error: "",
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: { title: string; value: string; icon: React.ElementType; description?: string }) {
  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const adminWalletAddress = process.env.NEXT_PUBLIC_ADMIN_WITHDRAW_WALLET || "Not configured"

  const [formState, formAction, isPending] = useActionState(adminWithdrawAction, initialState)

  const refetchData = async () => {
    setIsLoading(true)
    const result = await getAdminDashboardData()
    if (result.success) {
      setData(result.data)
      setError(null)
    } else {
      setError(result.error || "Failed to load data.")
      setData(null)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    refetchData()
  }, [])

  useEffect(() => {
    if (formState?.error) {
      toast.error("Withdrawal Failed", { description: formState.error })
    }
    if (formState?.success && formState.message) {
      toast.success("Withdrawal Successful", {
        description: formState.message,
        action: formState.signature
          ? {
              label: "View on Solscan",
              onClick: () => window.open(`https://solscan.io/tx/${formState.signature}?cluster=mainnet-beta`, "_blank"),
            }
          : undefined,
      })
      refetchData()
    }
  }, [formState])

  // Calculate the amount that can be withdrawn based on the 80% rule.
  // This is the amount needed to bring total withdrawn up to 80% of total earnings.
  const targetWithdrawAmount = Math.max(
    0,
    (data?.platform_total_earnings ?? 0) * 0.8 - (data?.platform_total_withdrawn ?? 0),
  )

  // The actual withdrawal amount is capped by the physical balance in the wallet.
  const withdrawableAmount = Math.min(targetWithdrawAmount, data?.platform_available_for_withdrawal ?? 0)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <p>Loading Admin Dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <Card className="w-full max-w-md border-red-500/50 bg-gray-900 text-white">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <CardTitle>Error Loading Admin Data</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refetchData} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-white">
      <header className="bg-gray-900 p-4 shadow-md">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </header>
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-300">Platform Earnings</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Available for Withdrawal"
              value={`${formatSol(withdrawableAmount)} SOL`}
              icon={Banknote}
              description="Amount to reach 80% of total earnings"
            />
            <StatCard
              title="Total Withdrawn"
              value={`${formatSol(data?.platform_total_withdrawn)} SOL`}
              icon={Landmark}
            />
            <StatCard
              title="Total Earnings"
              value={`${formatSol(data?.platform_total_earnings)} SOL`}
              icon={BarChart}
              description="20% of all nuke/line purchases"
            />
            <StatCard
              title="Claim Fees Paid"
              value={`${formatSol(data?.platform_fees_paid)} SOL`}
              icon={Coins}
              description="Actual on-chain fees paid"
            />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-300">Streamer Revenue</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Unclaimed" value={`${formatSol(data?.streamer_unclaimed)} SOL`} icon={AlertTriangle} />
            <StatCard title="Claimed" value={`${formatSol(data?.streamer_claimed)} SOL`} icon={Users} />
            <StatCard title="Total Revenue" value={`${formatSol(data?.streamer_total)} SOL`} icon={BarChart} />
          </div>
        </div>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle>Withdraw Platform Earnings</CardTitle>
            <CardDescription className="text-gray-400">
              Withdraw available earnings. The goal is to maintain a reserve buffer for fees, keeping at least 20% of
              total historical earnings in the wallet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction}>
              <div className="flex items-center justify-between rounded-lg bg-gray-900 p-4">
                <div>
                  <p className="text-sm text-gray-400">Amount to withdraw</p>
                  <p className="text-xl font-bold">{formatSol(withdrawableAmount)} SOL</p>
                </div>
                <Button
                  type="submit"
                  disabled={isPending || withdrawableAmount <= 0}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isPending ? "Processing..." : "Withdraw"}
                </Button>
              </div>
            </form>
            <p className="mt-2 text-xs text-gray-500">Destination Wallet: {adminWalletAddress}</p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
