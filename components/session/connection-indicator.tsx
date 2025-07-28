"use client"

import { RefreshCw, Wifi, WifiOff } from "lucide-react"
import type { ConnectionStatus } from "@/hooks/use-realtime-channel"

interface ConnectionIndicatorProps {
  status: ConnectionStatus
}

export function ConnectionIndicator({ status }: ConnectionIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case "connected":
        return "text-green-400"
      case "disconnected":
        return "text-red-400"
      case "reconnecting":
        return "text-yellow-400"
      default:
        return "text-gray-400"
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "connected":
        return <Wifi className="h-4 w-4" />
      case "disconnected":
        return <WifiOff className="h-4 w-4" />
      case "reconnecting":
        return <RefreshCw className="h-4 w-4 animate-spin" />
      default:
        return <Wifi className="h-4 w-4" />
    }
  }

  return (
    <div className={`flex items-center gap-1 ${getStatusColor()}`}>
      {getStatusIcon()}
      <span className="text-xs font-medium capitalize">{status}</span>
    </div>
  )
}
