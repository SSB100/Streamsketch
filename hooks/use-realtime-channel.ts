"use client"

import { useEffect, useMemo, useRef } from "react"
import { useSupabase } from "@/components/providers/supabase-provider"
import type { RealtimeChannel } from "@supabase/supabase-js"
import type { Drawing } from "@/lib/types"

interface ChannelOptions {
  onStrokeBroadcast?: (payload: { stroke: Drawing }) => void
  onNukeBroadcast?: (payload: { username: string | null; animationId: string }) => void
}

export function useRealtimeChannel(sessionId: string | null, options: ChannelOptions) {
  const supabase = useSupabase()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const optionsRef = useRef(options)

  // Update options ref when they change to avoid re-subscribing
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const channelId = useMemo(() => (sessionId ? `session-${sessionId}` : null), [sessionId])

  useEffect(() => {
    if (!channelId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }

    const channel = supabase.channel(channelId, {
      config: {
        broadcast: {
          self: false, // Don't receive our own broadcasts
        },
      },
    })
    channelRef.current = channel

    channel
      .on("broadcast", { event: "stroke" }, ({ payload }) => {
        optionsRef.current.onStrokeBroadcast?.(payload)
      })
      .on("broadcast", { event: "nuke" }, ({ payload }) => {
        optionsRef.current.onNukeBroadcast?.(payload)
      })
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Realtime] Subscribed to ${channelId}`)
        }
        if (err) {
          console.error(`[Realtime] ${channelId} error:`, err.message)
        }
      })

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [channelId, supabase])

  return channelRef.current
}
