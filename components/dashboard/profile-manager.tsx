"use client"

import type React from "react"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Loader2 } from "lucide-react"
import { updateUserUsername } from "@/app/actions"
import { toast } from "sonner"

interface ProfileManagerProps {
  initialUsername: string | null
}

export function ProfileManager({ initialUsername }: ProfileManagerProps) {
  const { publicKey } = useWallet()
  const [username, setUsername] = useState(initialUsername || "")
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey) {
      toast.error("Please connect your wallet first.")
      return
    }

    if (!username.trim()) {
      toast.error("Username cannot be empty.")
      return
    }

    setIsUpdating(true)
    try {
      const result = await updateUserUsername(publicKey.toBase58(), username.trim())
      if (result.success) {
        toast.success("Username updated successfully!")
      } else {
        toast.error("Failed to update username", { description: result.error })
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred", { description: error.message })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card className="border-border/20 bg-white/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <CardTitle className="text-white">Profile Settings</CardTitle>
        </div>
        <CardDescription>Customize your display name for the leaderboard and drawings.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdateUsername} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white">
              Username
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              maxLength={15}
              disabled={!publicKey || isUpdating}
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">3-15 characters, letters, numbers, and underscores only.</p>
          </div>
          <Button type="submit" disabled={!publicKey || isUpdating || username === initialUsername}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Username
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
