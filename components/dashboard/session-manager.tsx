"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, ExternalLink, Users, Loader2 } from "lucide-react"
import { createSession, deleteSession } from "@/app/actions"
import { toast } from "sonner"

interface Session {
  id: string
  short_code: string
  is_active: boolean
  is_free?: boolean
  created_at: string
}

interface SessionManagerProps {
  initialSessions?: Session[]
  walletAddress: string
  onSessionUpdate?: () => void
}

export function SessionManager({ initialSessions = [], walletAddress, onSessionUpdate }: SessionManagerProps) {
  const [sessionName, setSessionName] = useState("")
  const [isFree, setIsFree] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingSession, setDeletingSession] = useState<string | null>(null)

  // Ensure we have a valid array and filter out any invalid entries
  const validSessions = Array.isArray(initialSessions)
    ? initialSessions.filter((session) => session && session.short_code)
    : []

  const handleCreateSession = async () => {
    if (!sessionName.trim()) {
      toast.error("Please enter a session name")
      return
    }

    if (!walletAddress) {
      toast.error("Wallet not connected")
      return
    }

    setIsCreating(true)
    try {
      const result = await createSession(walletAddress, sessionName.trim(), isFree)

      if (result.success) {
        toast.success("Session created successfully!")
        setSessionName("")
        setIsFree(false)
        // Call the update callback to refresh the parent component
        if (onSessionUpdate) {
          onSessionUpdate()
        }
      } else {
        toast.error(result.error || "Failed to create session")
      }
    } catch (error) {
      console.error("Error creating session:", error)
      toast.error("Failed to create session")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!walletAddress) {
      toast.error("Wallet not connected")
      return
    }

    setDeletingSession(sessionId)
    try {
      const result = await deleteSession(sessionId, walletAddress)

      if (result.success) {
        toast.success("Session deleted successfully!")
        // Call the update callback to refresh the parent component
        if (onSessionUpdate) {
          onSessionUpdate()
        }
      } else {
        toast.error(result.error || "Failed to delete session")
      }
    } catch (error) {
      console.error("Error deleting session:", error)
      toast.error("Failed to delete session")
    } finally {
      setDeletingSession(null)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return "Invalid date"
    }
  }

  return (
    <Card className="border-cyan-400/20 bg-white/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cyan-400">
          <Users className="h-5 w-5" />
          Session Manager ({validSessions.length})
        </CardTitle>
        <CardDescription className="text-muted-foreground">Create and manage your drawing sessions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create New Session */}
        <div className="space-y-3 rounded-lg border border-cyan-400/20 p-4">
          <h3 className="font-medium text-white">Create New Session</h3>
          <div>
            <Label htmlFor="session-name" className="text-white">
              Session Name
            </Label>
            <Input
              id="session-name"
              type="text"
              placeholder="Enter session name (3-20 characters)"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              maxLength={20}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="is-free" checked={isFree} onCheckedChange={setIsFree} />
            <Label htmlFor="is-free" className="text-white">
              Free Session (no credits required)
            </Label>
          </div>

          <Button
            onClick={handleCreateSession}
            disabled={isCreating || !sessionName.trim() || !walletAddress}
            className="w-full bg-cyan-400 text-black hover:bg-cyan-400/90"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Session
              </>
            )}
          </Button>

          {!walletAddress && <p className="text-sm text-red-400">Please connect your wallet to create sessions</p>}
        </div>

        {/* Existing Sessions */}
        <div className="space-y-3">
          <h3 className="font-medium text-white">Your Sessions</h3>
          {validSessions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No sessions created yet</p>
              <p className="text-xs">Create your first session to get started</p>
            </div>
          ) : (
            validSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white font-mono">{session.short_code}</span>
                    <div className="flex gap-1">
                      {session.is_active && (
                        <Badge variant="default" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                          Active
                        </Badge>
                      )}
                      {session.is_free && (
                        <Badge variant="outline" className="text-xs border-blue-400 text-blue-400">
                          Free
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Created {formatDate(session.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = `/session/draw/${session.short_code}`
                      window.open(url, "_blank")
                    }}
                    className="text-white hover:bg-white/10"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSession(session.id)}
                    disabled={deletingSession === session.id}
                    className="text-white hover:bg-white/10"
                  >
                    {deletingSession === session.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
