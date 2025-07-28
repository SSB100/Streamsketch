"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, DollarSign, TrendingUp, Clock } from "lucide-react"
import { claimRevenueAction } from "@/app/actions"
import { useActionState } from "react"
import { toast } from "sonner"
import { createSupabaseClient } from "@/lib/supabase/client"

interface RevenueData {
  total_revenue: number
  unclaimed_revenue: number
  last_claim_date: string | null
  can_claim: boolean
}

export function RevenueManager() {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [state, formAction, isPending] = useActionState(claimRevenueAction, {
    success: false,
    message: "",
    signature: null,
  })

  const supabase = createSupabaseClient()

  useEffect(() => {
    fetchRevenueData()
  }, [])

  useEffect(() => {
    if (state.success && state.signature) {
      toast.success(
        <div className="flex flex-col gap-2">
          <span>{state.message}</span>
          <a
            href={`https://solscan.io/tx/${state.signature}?cluster=mainnet-beta`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 underline"
          >
            View on Solscan <ExternalLink className="h-3 w-3" />
          </a>
        </div>,
        {
          duration: 10000,
        },
      )
      fetchRevenueData() // Refresh data after successful claim
    } else if (!state.success && state.message) {
      toast.error(state.message)
    }
  }, [state])

  const fetchRevenueData = async () => {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { data, error } = await supabase.rpc("get_user_revenue_summary", { user_id: user.id }).single()

      if (error) throw error

      setRevenueData(data)
    } catch (error) {
      console.error("Error fetching revenue data:", error)
      toast.error("Failed to load revenue data")
    } finally {
      setLoading(false)
    }
  }

  const formatSOL = (amount: number) => {
    return `${amount.toFixed(6)} SOL`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!revenueData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Failed to load revenue data</p>
          <Button onClick={fetchRevenueData} variant="outline" className="mt-2 bg-transparent">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Revenue Management
        </CardTitle>
        <CardDescription>Manage your earned revenue from the platform</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatSOL(revenueData.total_revenue)}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Available to Claim</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{formatSOL(revenueData.unclaimed_revenue)}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Last Claim</span>
            </div>
            <p className="text-lg font-semibold text-gray-700">{formatDate(revenueData.last_claim_date)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Claim Status:{" "}
              <Badge variant={revenueData.can_claim ? "default" : "secondary"}>
                {revenueData.can_claim ? "Available" : "Not Available"}
              </Badge>
            </p>
            {revenueData.unclaimed_revenue > 0 && (
              <p className="text-xs text-gray-500">
                You have {formatSOL(revenueData.unclaimed_revenue)} ready to claim
              </p>
            )}
          </div>

          <form action={formAction}>
            <Button
              type="submit"
              disabled={!revenueData.can_claim || revenueData.unclaimed_revenue <= 0 || isPending}
              className="min-w-[120px]"
            >
              {isPending ? "Claiming..." : "Claim Revenue"}
            </Button>
          </form>
        </div>

        {!revenueData.can_claim && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Revenue claiming is currently unavailable. This could be due to insufficient balance, cooldown period, or
              system maintenance.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
