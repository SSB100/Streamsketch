"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { updateUserUsername } from "@/app/actions"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface ProfileManagerProps {
  initialUsername: string | null
  onProfileUpdate: () => void
}

export function ProfileManager({ initialUsername, onProfileUpdate }: ProfileManagerProps) {
  const { publicKey } = useWallet()
  const [username, setUsername] = useState(initialUsername || "")
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (!publicKey) {
      toast.error("Wallet not connected.")
      return
    }
    if (!username || username.length < 3) {
      toast.error("Username must be at least 3 characters long.")
      return
    }

    setIsLoading(true)
    const result = await updateUserUsername(publicKey.toBase58(), username)
    setIsLoading(false)

    if (result.success) {
      toast.success("Username updated successfully!")
      setIsEditing(false)
      onProfileUpdate()
    } else {
      toast.error(`Failed to update username: ${result.error}`)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Manage your public profile settings.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <label htmlFor="username" className="text-sm font-medium">
            Username
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!isEditing || isLoading}
              placeholder="Your public username"
              className="max-w-sm"
            />
            {!isEditing ? (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save"}
                </Button>
                <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isLoading}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Your username will be visible to other users.</p>
        </div>
      </CardContent>
    </Card>
  )
}
