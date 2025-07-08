"use client"

import { useEffect, useMemo, useRef } from "react"
import { useSupabase } from "@/components/providers/supabase-provider"
import type { RealtimeChannel } from "@supabase/supabase-js"
import type { Drawing } from "@/lib/types"

type BroadcastPayload = {
  nuke: {
    username: string | null
    animationId: string
    nukeTimestamp: number // Add timestamp to nuke event
  }
  draw: { drawing: Drawing }
}

type UseRealtimeChannelOptions = {
  onNukeBroadcast: (payload: BroadcastPayload["nuke"]) => void
  onDrawBroadcast: (payload: BroadcastPayload["draw"]) => void
  onSubscribed: () => void // Add callback for successful connection/reconnection
}

export function useRealtimeChannel(sessionId: string | null, options: UseRealtimeChannelOptions) {
  const supabase = useSupabase()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const optionsRef = useRef(options)

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

    const channel = supabase.channel(channelId)
    channelRef.current = channel

    channel.on("broadcast", { event: "nuke" }, (evt) => {
      optionsRef.current.onNukeBroadcast(evt.payload)
    })

    channel.on("broadcast", { event: "draw" }, (evt) => {
      optionsRef.current.onDrawBroadcast(evt.payload)
    })

    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        console.log(`[Realtime] Subscribed: ${channelId}`)
        // Trigger the callback on successful connection/reconnection
        optionsRef.current.onSubscribed()
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
