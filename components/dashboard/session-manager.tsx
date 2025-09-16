"use client"

import type React from "react"
import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, Loader2, Copy, Eye, LinkIcon, Trash2 } from "lucide-react"
import { createSession, deleteSession } from "@/app/actions"
import Link from "next/link"

type Session = {
  id: string
  short_code: string
  is_active: boolean
  created_at: string
}

interface SessionManagerProps {
  initialSessions: Session[]
  onSessionUpdate?: () => void
}

export function SessionManager({ initialSessions, onSessionUpdate }: SessionManagerProps) {
  const { publicKey } = useWallet()
  const [sessions, setSessions] = useState(initialSessions)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [sessionName, setSessionName] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey) {
      toast.error("Please connect your wallet first.")
      return
    }
    setIsCreating(true)
    try {
      const result = await createSession(publicKey.toBase58(), sessionName)
      if (result.success && result.data) {
        toast.success(`Session "${result.data.short_code}" created!`)
        setSessions((prev) => [result.data, ...prev])
        setSessionName("")
        setIsDialogOpen(false)
        onSessionUpdate?.()
      } else {
        toast.error("Failed to create session", { description: result.error })
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred", { description: error.message })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!publicKey) {
      toast.error("Wallet not connected.")
      return
    }
    setDeletingSessionId(sessionId)
    try {
      const result = await deleteSession(sessionId, publicKey.toBase58())
      if (result.success) {
        toast.success("Session deleted.")
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
        onSessionUpdate?.()
      } else {
        toast.error("Failed to delete session", { description: result.error })
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred", { description: error.message })
    } finally {
      setDeletingSessionId(null)
    }
  }

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text)
    toast.success(message)
  }

  return (
    <Card className="border-border/20 bg-white/5">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white">Your Sessions</CardTitle>
          <CardDescription>Manage your whiteboards and share them with your audience.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!publicKey}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create a new session</DialogTitle>
              <DialogDescription>
                Give your session a unique name. A random code will be appended to it.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSession}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="col-span-3"
                    placeholder="e.g., Monday-Stream"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Session
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-white">Session Code</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Created</TableHead>
              <TableHead className="text-right text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary">{session.short_code}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(session.short_code, "Session code copied!")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        session.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {session.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(session.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary bg-transparent"
                        onClick={() =>
                          copyToClipboard(
                            `${window.location.origin}/session/view/${session.short_code}`,
                            "OBS view link copied!",
                          )
                        }
                      >
                        <Copy className="mr-1 h-3 w-3" /> Copy View Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary text-primary hover:bg-primary/10 hover:text-primary bg-transparent"
                        onClick={() =>
                          copyToClipboard(
                            `${window.location.origin}/session/draw/${session.short_code}`,
                            "Viewer draw link copied!",
                          )
                        }
                      >
                        <LinkIcon className="mr-1 h-3 w-3" /> Copy Draw Link
                      </Button>
                      <Link href={`/session/view/${session.short_code}`} target="_blank" rel="noopener noreferrer">
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary bg-transparent h-9 w-9"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Session in new tab</span>
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={deletingSessionId === session.id}>
                            {deletingSessionId === session.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="mr-1 h-3 w-3" />
                            )}
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the session "{session.short_code}" and all its drawings. This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSession(session.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Yes, delete session
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  You haven't created any sessions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
