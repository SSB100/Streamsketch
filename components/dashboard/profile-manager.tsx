"use client"

import type React from "react"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { updateUserUsername } from "@/app/actions"
import { Loader2, User, Edit3, Check, X, Copy } from "lucide-react"

interface ProfileManagerProps {
  initialUsername: string | null
}

export function ProfileManager({ initialUsername }: ProfileManagerProps) {
  const { publicKey } = useWallet()
  const [username, setUsername] = useState(initialUsername || "")
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey) {
      toast.error("Wallet not connected.")
      return
    }
    if (username === initialUsername) {
      toast.info("Username is already set to this.")
      setIsEditing(false)
      return
    }
    setIsLoading(true)
    try {
      const result = await updateUserUsername(publicKey.toBase58(), username)
      if (result.success) {
        toast.success("Username updated successfully!")
        setIsEditing(false)
      } else {
        toast.error("Failed to update username", { description: result.error })
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred", { description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setUsername(initialUsername || "")
    setIsEditing(false)
  }

  const copyWalletAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58())
      toast.success("Wallet address copied to clipboard!")
    }
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neon-pink/10 border border-neon-pink/20">
            <User className="h-6 w-6 text-neon-pink" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">{initialUsername || "Anonymous User"}</h3>
            <p className="text-sm text-gray-400">StreamSketch Creator</p>
          </div>
        </div>

        <Separator className="bg-border/20" />

        {/* Wallet Address */}
        <div className="flex items-center justify-between rounded-lg bg-deep-space/30 p-3">
          <div className="flex-1 min-w-0">
            <Label className="text-xs text-muted-foreground">Wallet Address</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm font-mono text-white truncate">
                {publicKey ? truncateAddress(publicKey.toBase58()) : "Not connected"}
              </code>
              <Badge variant="secondary" className="text-xs shrink-0">
                Connected
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyWalletAddress}
            disabled={!publicKey}
            className="text-gray-400 hover:text-white shrink-0 ml-2"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator className="bg-border/20" />

      {/* Username Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-white">Display Name</Label>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-gray-400 hover:text-white"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your display name"
              className="bg-deep-space/50 border-border/40 text-white"
              maxLength={50}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isLoading || !username.trim()}
                size="sm"
                className="bg-neon-pink hover:bg-neon-pink/90 text-white font-semibold flex-1"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {isLoading ? "Updating..." : "Save"}
              </Button>
              <Button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="border-border/40 text-gray-400 hover:text-white bg-transparent"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-lg bg-deep-space/30 p-3">
            <p className="text-white">{initialUsername || "No display name set"}</p>
            <p className="text-xs text-muted-foreground mt-1">This is how other users will see you</p>
          </div>
        )}
      </div>
    </div>
  )
}
