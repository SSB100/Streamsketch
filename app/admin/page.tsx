"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import AdminDashboard from "@/components/admin/admin-dashboard"
import { ShieldAlert } from "lucide-react"

// In a real application, this should be an environment variable.
// For this demo, we'll use the user's requested password.
const ADMIN_PASSWORD = "ADHD2024!!"

export default function AdminPage() {
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setError("")
    } else {
      setError("Incorrect password.")
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
            />
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
              Authenticate
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-gray-500">
            <strong>Security Warning:</strong> For production, the password should be managed via environment variables,
            not hardcoded.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
