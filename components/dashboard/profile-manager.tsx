"use client"

import type React from "react"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateUserUsername } from "@/app/actions"
import { Loader2 } from "lucide-react"

interface ProfileManagerProps {
  initialUsername: string | null
}

export function ProfileManager({ initialUsername }: ProfileManagerProps) {
  const { publicKey } = useWallet()
  const [username, setUsername] = useState(initialUsername || "")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey) {
      toast.error("Wallet not connected.")
      return
    }
    if (username === initialUsername) {
      toast.info("Username is already set to this.")
      return
    }
    setIsLoading(true)
    try {
      const result = await updateUserUsername(publicKey.toBase58(), username)
      if (result.success) {
        toast.success("Username updated successfully!")
      } else {
        toast.error("Failed to update username", { description: result.error })
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred", { description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border/20 bg-white/5">
      <CardHeader>
        <CardTitle className="text-white">Your Profile</CardTitle>
        <CardDescription>Set a unique username to be displayed when you interact.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex items-end gap-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="username" className="text-white">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="YourAwesomeName"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              pattern="^[a-zA-Z0-9_]{3,15}$"
              title="3-15 characters, letters, numbers, and underscores only."
              required
            />
          </div>
          <Button type="submit" disabled={isLoading || !publicKey || username === initialUsername}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
