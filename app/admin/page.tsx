"use client"

import type React from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import AdminDashboard from "@/components/admin/admin-dashboard"
import { ShieldAlert } from "lucide-react"
import { verifyAdminPassword } from "./actions"

export default function AdminPage() {
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsVerifying(true)
    try {
      const result = await verifyAdminPassword(password)
      if (result.success) {
        setIsAuthenticated(true)
      } else {
        setError("Incorrect password.")
      }
    } catch (err) {
      setError("An error occurred during authentication.")
    } finally {
      setIsVerifying(false)
    }
  }

  if (isAuthenticated) {
    return <AdminDashboard />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md border-yellow-500/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
            <ShieldAlert className="h-6 w-6 text-yellow-400" />
          </div>
          <CardTitle>Admin Access Required</CardTitle>
          <CardDescription>This area is restricted. Please enter the password to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="text-center"
              disabled={isVerifying}
            />
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
              disabled={isVerifying}
            >
              {isVerifying ? "Authenticating..." : "Authenticate"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-gray-500">
            <strong>Security Note:</strong> Authentication is handled securely on the server.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
