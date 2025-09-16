"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Copy, ExternalLink, Infinity } from "lucide-react"
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
  sessions: Session[]
  walletAddress: string
}

export function SessionManager({ sessions, walletAddress }: SessionManagerProps) {
  const [sessionName, setSessionName] = useState("")
  const [isFree, setIsFree] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateSession = async () => {
    if (!sessionName.trim()) {
      toast.error("Please enter a session name")
      return
    }

    setIsCreating(true)
    try {
      const result = await createSession(walletAddress, sessionName.trim(), isFree)

      if (result.success) {
        toast.success(`Session "${sessionName}" created successfully!`)
        setSessionName("")
        setIsFree(false)
      } else {
        toast.error(result.error || "Failed to create session")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteSession = async (sessionId: string, sessionCode: string) => {
    if (!confirm(`Are you sure you want to delete session "${sessionCode}"?`)) {
      return
    }

    try {
      const result = await deleteSession(sessionId, walletAddress)

      if (result.success) {
        toast.success("Session deleted successfully")
      } else {
        toast.error(result.error || "Failed to delete session")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    }
  }

  const copySessionCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success("Session code copied to clipboard!")
  }

  const openSession = (code: string) => {
    window.open(`/session/draw/${code}`, "_blank")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Manager</CardTitle>
        <CardDescription>Create and manage your drawing sessions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create New Session */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-name">Session Name</Label>
            <Input
              id="session-name"
              placeholder="Enter session name (3-20 characters)"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="free-session" checked={isFree} onCheckedChange={setIsFree} />
            <Label htmlFor="free-session" className="flex items-center gap-2">
              Free Session
              {isFree && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                  <Infinity className="w-3 h-3 mr-1" />
                  FREE
                </Badge>
              )}
            </Label>
          </div>

          {isFree && (
            <p className="text-sm text-muted-foreground">
              Free sessions allow unlimited drawing without credits. Nukes still require credits.
            </p>
          )}

          <Button onClick={handleCreateSession} disabled={isCreating || !sessionName.trim()} className="w-full">
            {isCreating ? "Creating..." : "Create Session"}
          </Button>
        </div>

        {/* Sessions List */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Your Sessions</h3>

          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No sessions created yet. Create your first session above!
            </p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{session.short_code}</span>
                        {session.is_free && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                            <Infinity className="w-3 h-3 mr-1" />
                            FREE
                          </Badge>
                        )}
                        {session.is_active && <Badge variant="default">Active</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => copySessionCode(session.short_code)}>
                      <Copy className="w-4 h-4" />
                    </Button>

                    <Button variant="outline" size="sm" onClick={() => openSession(session.short_code)}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSession(session.id, session.short_code)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
