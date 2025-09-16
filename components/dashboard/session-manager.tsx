"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, ExternalLink, Users } from "lucide-react"
import { createSession, deleteSession } from "@/app/actions"
import { toast } from "sonner"

interface Session {
  id: string
  short_code: string
  is_active: boolean
  is_free: boolean
  created_at: string
}

interface SessionManagerProps {
  userSessions?: Session[]
  walletAddress?: string
}

export function SessionManager({ userSessions = [], walletAddress = "" }: SessionManagerProps) {
  const [sessionName, setSessionName] = useState("")
  const [isFree, setIsFree] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingSession, setDeletingSession] = useState<string | null>(null)

  // Ensure we have a valid array and filter out any invalid entries
  const validSessions = Array.isArray(userSessions)
    ? userSessions.filter((session) => session && session.short_code)
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Session Manager
        </CardTitle>
        <CardDescription>Create and manage your drawing sessions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div>
            <Label htmlFor="session-name">Session Name</Label>
            <Input
              id="session-name"
              type="text"
              placeholder="Enter session name (3-20 characters)"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="is-free" checked={isFree} onCheckedChange={setIsFree} />
            <Label htmlFor="is-free">Free Session (no credits required)</Label>
          </div>

          <Button onClick={handleCreateSession} disabled={isCreating || !sessionName.trim()} className="w-full">
            {isCreating ? (
              <>
                <Plus className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Session
              </>
            )}
          </Button>
        </div>

        {validSessions.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Your Sessions</h4>
            {validSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-medium">{session.short_code}</span>
                    <div className="flex gap-1">
                      {session.is_active && (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      )}
                      {session.is_free && (
                        <Badge variant="secondary" className="text-xs">
                          Free
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Created {formatDate(session.created_at)}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = `/session/draw/${session.short_code}`
                      window.open(url, "_blank")
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSession(session.id)}
                    disabled={deletingSession === session.id}
                  >
                    {deletingSession === session.id ? (
                      <Plus className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No sessions created yet</p>
            <p className="text-xs">Create your first session to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
