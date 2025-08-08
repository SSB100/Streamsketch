"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
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

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

export function useRealtimeChannel(sessionId: string | null, options: UseRealtimeChannelOptions) {
  const supabase = useSupabase()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const optionsRef = useRef(options)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connected")

  // exponential backoff state
  const backoffRef = useRef<{ attempt: number; timer: number | null }>({ attempt: 0, timer: null })

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const channelId = useMemo(() => (sessionId ? `session-${sessionId}` : null), [sessionId])

  const clearBackoffTimer = () => {
    if (backoffRef.current.timer) {
      window.clearTimeout(backoffRef.current.timer)
      backoffRef.current.timer = null
    }
  }

  const resetBackoff = () => {
    clearBackoffTimer()
    backoffRef.current.attempt = 0
  }

  const scheduleReconnect = useCallback(
    (reason: string) => {
      if (!channelId) return

      // Ensure we tear down any existing channel before scheduling a reconnect
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
        } catch (e) {
          // ignore
        }
        channelRef.current = null
      }

      setConnectionStatus("reconnecting")
      const attempt = ++backoffRef.current.attempt
      const delay = Math.min(30000, 1000 * Math.pow(2, attempt - 1)) // 1s, 2s, 4s, 8s, 16s, 30s cap

      console.warn(`[Realtime] Scheduling reconnect (attempt ${attempt}) in ${delay}ms due to: ${reason}`)

      clearBackoffTimer()
      backoffRef.current.timer = window.setTimeout(() => {
        if (channelId) {
          createAndSubscribeChannel(channelId)
        }
      }, delay)
    },
    [channelId, supabase],
  )

  const createAndSubscribeChannel = useCallback(
    (id: string) => {
      // Defensive: cleanup previous channel if any
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
        } catch {
          // ignore
        }
        channelRef.current = null
      }

      // NOTE: We intentionally do NOT set broadcast.ack = true.
      // Some Realtime deployments don't support ACK and will emit CHANNEL_ERROR.
      const channel = supabase.channel(id)
      channelRef.current = channel

      channel.on("broadcast", { event: "nuke" }, (evt) => {
        try {
          optionsRef.current.onNukeBroadcast(evt.payload)
        } catch (err) {
          console.error("[Realtime] onNukeBroadcast handler error:", err)
        }
      })

      channel.on("broadcast", { event: "draw" }, (evt) => {
        try {
          optionsRef.current.onDrawBroadcast(evt.payload)
        } catch (err) {
          console.error("[Realtime] onDrawBroadcast handler error:", err)
        }
      })

      channel.subscribe((status, err) => {
        switch (status) {
          case "SUBSCRIBED":
            console.log(`[Realtime] Subscribed: ${id}`)
            setConnectionStatus("connected")
            resetBackoff()
            break
          case "CHANNEL_ERROR": {
            const msg = (err as any)?.message || (err as any)?.toString?.() || "Unknown error"
            console.error(`[Realtime] Channel Error: ${id} -> ${msg}`)
            scheduleReconnect("CHANNEL_ERROR")
            break
          }
          case "TIMED_OUT":
            console.warn(`[Realtime] Timed Out: ${id}. Reconnecting...`)
            scheduleReconnect("TIMED_OUT")
            break
          case "CLOSED":
            // Closed can be intentional on unmount, don't always reconnect.
            // If we still have a channelId, we assume it was unintentional and try to reconnect.
            console.log(`[Realtime] Channel Closed: ${id}`)
            if (channelId) {
              scheduleReconnect("CLOSED")
            }
            break
        }
      })
    },
    [channelId, scheduleReconnect, supabase],
  )

  useEffect(() => {
    if (!channelId) {
      // cleanup if no channelId
      clearBackoffTimer()
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
        } catch {
          // ignore
        }
        channelRef.current = null
      }
      setConnectionStatus("disconnected")
      return
    }

    setConnectionStatus("reconnecting") // transient while we subscribe
    createAndSubscribeChannel(channelId)

    return () => {
      clearBackoffTimer()
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
        } catch {
          // ignore
        }
        channelRef.current = null
      }
    }
  }, [channelId, supabase, createAndSubscribeChannel])

  // Browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log("[System] Back online.")
      // Prompt a reconnect attempt soon if we were offline
      if (connectionStatus !== "connected" && channelId) {
        scheduleReconnect("BROWSER_ONLINE")
      }
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
  }, [channelId, connectionStatus, scheduleReconnect])

  // Proactive health check: if channel silently drops, switch to reconnecting
  useEffect(() => {
    const interval = window.setInterval(() => {
      const ch = channelRef.current
      if (!ch) return
      if ((ch.state === "closed" || ch.state === "errored") && connectionStatus === "connected") {
        console.warn(`[Realtime Health Check] Detected stale connection (state: ${ch.state}). Forcing reconnect.`)
        scheduleReconnect(`HEALTH_CHECK_${ch.state}`)
      }
    }, 15000)

    return () => window.clearInterval(interval)
  }, [connectionStatus, scheduleReconnect])

  return { channel: channelRef.current, connectionStatus }
}
