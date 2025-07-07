"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Gift, ExternalLink, Rocket, Bomb } from "lucide-react"
import Link from "next/link"

interface FreeCreditsDisplayProps {
  freeCreditSessions: Array<{
    session_id: string
    session_code: string
    free_lines: number
    free_nukes: number
    granted_at: string
  }>
}

export function FreeCreditsDisplay({ freeCreditSessions }: FreeCreditsDisplayProps) {
  if (freeCreditSessions.length === 0) {
    return null
  }

  return (
    <Card className="border-green-400/20 bg-white/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-green-400" />
          <CardTitle className="text-white">Your Free Credits</CardTitle>
        </div>
        <CardDescription>Free credits gifted to you by streamers. These are tied to specific sessions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {freeCreditSessions.map((session) => (
            <div
              key={session.session_id}
              className="flex items-center justify-between rounded-lg border border-green-400/20 bg-green-400/5 p-3"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-mono font-bold text-green-400">{session.session_code}</p>
                  <p className="text-xs text-muted-foreground">
                    Received {new Date(session.granted_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {session.free_lines > 0 && (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                      <Rocket className="mr-1 h-3 w-3" />
                      {session.free_lines} Lines
                    </Badge>
                  )}
                  {session.free_nukes > 0 && (
                    <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400">
                      <Bomb className="mr-1 h-3 w-3" />
                      {session.free_nukes} Nukes
                    </Badge>
                  )}
                </div>
              </div>
              <Link href={`/session/draw/${session.session_code}`} target="_blank" rel="noopener noreferrer">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-400 text-green-400 hover:bg-green-400/10 bg-transparent"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Use Credits
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
