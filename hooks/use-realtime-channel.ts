"use client"

import { useEffect, useMemo, useRef } from "react"
import { useSupabase } from "@/components/providers/supabase-provider"
import type { RealtimeChannel } from "@supabase/supabase-js"
import type { Drawing } from "@/lib/types"

type BroadcastPayload = {
  draw_batch: { segments: Drawing[] }
  nuke: { username: string | null; animationId: string }
}

type UseRealtimeChannelOptions = {
  onDrawBatchBroadcast: (payload: BroadcastPayload["draw_batch"]) => void
  onNukeBroadcast: (payload: BroadcastPayload["nuke"]) => void
}

/**
 * Pure-WebSocket channel (broadcast only) – avoids replication-slot errors.
 */
export function useRealtimeChannel(sessionId: string | null, options: UseRealtimeChannelOptions) {
  const supabase = useSupabase()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const optionsRef = useRef(options)

  // Update options ref when they change
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const channelId = useMemo(() => (sessionId ? `session-${sessionId}` : null), [sessionId])

  useEffect(() => {
    if (!channelId) {
      // Clean up existing channel if sessionId becomes null
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }

    // Create new channel
    const channel = supabase.channel(channelId)
    channelRef.current = channel

    // Set up event listeners
    channel.on("broadcast", { event: "draw_batch" }, (evt) => {
      optionsRef.current.onDrawBatchBroadcast(evt.payload)
    })

    channel.on("broadcast", { event: "nuke" }, (evt) => {
      optionsRef.current.onNukeBroadcast(evt.payload)
    })

    // Subscribe to the channel
    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        console.log(`[Realtime] Subscribed: ${channelId}`)
      }
      if (err) {
        console.error(`[Realtime] ${channelId} error:`, err.message)
      }
    })

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [channelId, supabase])

  return channelRef.current
}
