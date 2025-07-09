"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSupabase } from "@/components/providers/supabase-provider"
import type { RealtimeChannel } from "@supabase/supabase-js"
import type { Drawing } from "@/lib/types"

type BroadcastPayload = {
  nuke: {
    username: string | null
    animationId: string
    nukeTimestamp: number
  }
  draw: { drawing: Drawing }
}

type UseRealtimeChannelOptions = {
  onNukeBroadcast: (payload: BroadcastPayload["nuke"]) => void
  onDrawBroadcast: (payload: BroadcastPayload["draw"]) => void
}

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected"

export function useRealtimeChannel(sessionId: string | null, options: UseRealtimeChannelOptions) {
  const supabase = useSupabase()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const optionsRef = useRef(options)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connected")

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
          ack: true, // Request acknowledgement from server
        },
      },
    })
    channelRef.current = channel

    channel.on("broadcast", { event: "nuke" }, (evt) => {
      optionsRef.current.onNukeBroadcast(evt.payload)
    })

    channel.on("broadcast", { event: "draw" }, (evt) => {
      optionsRef.current.onDrawBroadcast(evt.payload)
    })

    channel.subscribe((status, err) => {
      switch (status) {
        case "SUBSCRIBED":
          console.log(`[Realtime] Subscribed: ${channelId}`)
          setConnectionStatus("connected")
          break
        case "CHANNEL_ERROR":
          console.error(`[Realtime] Channel Error: ${channelId}`, err)
          setConnectionStatus("reconnecting")
          break
        case "TIMED_OUT":
          console.warn(`[Realtime] Timed Out: ${channelId}. Reconnecting...`)
          setConnectionStatus("reconnecting")
          // Supabase client handles reconnection automatically
          break
        case "CLOSED":
          // This can happen on intentional unsubscription
          console.log(`[Realtime] Channel Closed: ${channelId}`)
          break
      }
    })

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [channelId, supabase])

  // Add listeners for browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log("[System] Back online.")
      // Supabase client will attempt to reconnect automatically
      setConnectionStatus("reconnecting")
    }
    const handleOffline = () => {
      console.warn("[System] Offline. Realtime connection paused.")
      setConnectionStatus("disconnected")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return { channel: channelRef.current, connectionStatus }
}
