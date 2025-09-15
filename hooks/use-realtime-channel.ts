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

export function useRealtimeChannel(sessionId: string | null, options: UseRealtimeChannelOptions) {
  const supabase = useSupabase()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const optionsRef = useRef(options)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connected")

  // Prevent infinite recursion with proper state management
  const isReconnectingRef = useRef(false)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const backoffAttemptRef = useRef(0)
  const maxReconnectAttempts = 5

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const channelId = useMemo(() => (sessionId ? `session-${sessionId}` : null), [sessionId])

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const resetBackoff = useCallback(() => {
    backoffAttemptRef.current = 0
    isReconnectingRef.current = false
    clearReconnectTimeout()
  }, [clearReconnectTimeout])

  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current)
      } catch (e) {
        console.warn("[Realtime] Error removing channel:", e)
      }
      channelRef.current = null
    }
  }, [supabase])

  const scheduleReconnect = useCallback(
    (reason: string) => {
      // Prevent infinite recursion
      if (isReconnectingRef.current || !channelId) {
        return
      }

      // Check max attempts
      if (backoffAttemptRef.current >= maxReconnectAttempts) {
        console.error(`[Realtime] Max reconnect attempts (${maxReconnectAttempts}) reached. Giving up.`)
        setConnectionStatus("disconnected")
        return
      }

      isReconnectingRef.current = true
      setConnectionStatus("reconnecting")

      const attempt = ++backoffAttemptRef.current
      const delay = Math.min(30000, 1000 * Math.pow(2, attempt - 1))

      console.warn(
        `[Realtime] Scheduling reconnect (attempt ${attempt}/${maxReconnectAttempts}) in ${delay}ms due to: ${reason}`,
      )

      clearReconnectTimeout()
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (channelId && isReconnectingRef.current) {
          createAndSubscribeChannel(channelId)
        }
      }, delay)
    },
    [channelId, clearReconnectTimeout],
  )

  const createAndSubscribeChannel = useCallback(
    (id: string) => {
      // Clean up any existing channel
      cleanupChannel()

      try {
        const channel = supabase.channel(id, {
          config: {
            broadcast: { self: false },
          },
        })

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
          console.log(`[Realtime] Status change: ${status} for channel ${id}`)

          switch (status) {
            case "SUBSCRIBED":
              console.log(`[Realtime] Successfully subscribed to: ${id}`)
              setConnectionStatus("connected")
              resetBackoff()
              break

            case "CHANNEL_ERROR": {
              const msg = err?.message || err?.toString?.() || "Unknown error"
              console.error(`[Realtime] Channel Error: ${id} -> ${msg}`)

              // Only schedule reconnect if we're not already reconnecting
              if (!isReconnectingRef.current) {
                scheduleReconnect("CHANNEL_ERROR")
              }
              break
            }

            case "TIMED_OUT":
              console.warn(`[Realtime] Timed Out: ${id}`)
              if (!isReconnectingRef.current) {
                scheduleReconnect("TIMED_OUT")
              }
              break

            case "CLOSED":
              console.log(`[Realtime] Channel Closed: ${id}`)
              // Only reconnect if we still have a channelId and we're not intentionally closing
              if (channelId && !isReconnectingRef.current) {
                scheduleReconnect("CLOSED")
              }
              break
          }
        })
      } catch (error) {
        console.error("[Realtime] Error creating channel:", error)
        if (!isReconnectingRef.current) {
          scheduleReconnect("CREATE_ERROR")
        }
      }
    },
    [supabase, cleanupChannel, resetBackoff, scheduleReconnect, channelId],
  )

  // Main effect for channel management
  useEffect(() => {
    if (!channelId) {
      cleanupChannel()
      clearReconnectTimeout()
      isReconnectingRef.current = false
      setConnectionStatus("disconnected")
      return
    }

    // Reset state for new channel
    resetBackoff()
    setConnectionStatus("reconnecting")
    createAndSubscribeChannel(channelId)

    return () => {
      cleanupChannel()
      clearReconnectTimeout()
      isReconnectingRef.current = false
    }
  }, [channelId, createAndSubscribeChannel, cleanupChannel, clearReconnectTimeout, resetBackoff])

  // Browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log("[System] Back online.")
      if (connectionStatus !== "connected" && channelId && !isReconnectingRef.current) {
        // Reset attempts when coming back online
        backoffAttemptRef.current = 0
        scheduleReconnect("BROWSER_ONLINE")
      }
    }

    const handleOffline = () => {
      console.warn("[System] Offline. Realtime connection paused.")
      setConnectionStatus("disconnected")
      clearReconnectTimeout()
      isReconnectingRef.current = false
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [channelId, connectionStatus, scheduleReconnect, clearReconnectTimeout])

  return { channel: channelRef.current, connectionStatus }
}
