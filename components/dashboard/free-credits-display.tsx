"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Paintbrush, Bomb, Gift } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

type FreeCreditSession = {
  session_id: string
  session_code: string
  free_lines: number
  free_nukes: number
  granted_at: string
}

interface FreeCreditsDisplayProps {
  freeCreditSessions: FreeCreditSession[]
}

export function FreeCreditsDisplay({ freeCreditSessions }: FreeCreditsDisplayProps) {
  if (!freeCreditSessions || freeCreditSessions.length === 0) {
    return null // Don't render anything if there are no free credits
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="border-primary/20 bg-gradient-to-br from-background to-white/5 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Your Free Credits</CardTitle>
              <CardDescription>A streamer has gifted you credits! Use them on an active canvas.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {freeCreditSessions
                .sort((a, b) => new Date(b.granted_at).getTime() - new Date(a.granted_at).getTime())
                .map((session, index) => (
                  <motion.div
                    key={session.session_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * (index + 1) }}
                    className="flex flex-col items-start justify-between gap-4 rounded-lg border border-border/50 bg-background/50 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <p className="font-mono text-lg font-semibold text-primary">{session.session_code}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {session.free_lines > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Paintbrush className="h-4 w-4" />
                            <span>
                              {session.free_lines} Free Line{session.free_lines > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                        {session.free_nukes > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Bomb className="h-4 w-4" />
                            <span>
                              {session.free_nukes} Free Nuke{session.free_nukes > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button asChild className="w-full sm:w-auto">
                      <Link href={`/session/draw/${session.session_code}`}>Go to Canvas</Link>
                    </Button>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
