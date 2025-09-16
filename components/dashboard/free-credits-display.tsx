"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Gift, Zap } from "lucide-react"

interface FreeCreditsDisplayProps {
  freeCreditSessions?: Array<{
    session_id: string
    session_code: string
    free_lines: number
    free_nukes: number
  }>
  totalFreeLines?: number
  totalFreeNukes?: number
}

export function FreeCreditsDisplay({
  freeCreditSessions = [],
  totalFreeLines = 0,
  totalFreeNukes = 0,
}: FreeCreditsDisplayProps) {
  // Ensure we have a valid array and filter out any invalid entries
  const validSessions = Array.isArray(freeCreditSessions)
    ? freeCreditSessions.filter((session) => session && session.session_code)
    : []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Free Credits
        </CardTitle>
        <CardDescription>Credits gifted to you by session owners</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{totalFreeLines || 0}</div>
            <div className="text-sm text-muted-foreground">Total Free Lines</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{totalFreeNukes || 0}</div>
            <div className="text-sm text-muted-foreground">Total Free Nukes</div>
          </div>
        </div>

        {validSessions.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Active Sessions</h4>
            {validSessions.map((session) => (
              <div key={session.session_id} className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="font-mono text-sm">{session.session_code}</span>
                <div className="flex gap-2">
                  {(session.free_lines || 0) > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {session.free_lines} lines
                    </Badge>
                  )}
                  {(session.free_nukes || 0) > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      {session.free_nukes}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No free credits available</p>
            <p className="text-xs">Session owners can gift you credits to use</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
