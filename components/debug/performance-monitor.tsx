"use client"

import { useEffect, useState } from "react"
import { PerformanceMonitor } from "@/lib/performance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function PerformanceDebugPanel() {
  const [stats, setStats] = useState<Record<string, any>>({})
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      const allStats: Record<string, any> = {}

      // Get all available stats
      const labels = ["getUserData", "spendDrawingCredit", "getUserData.userQuery", "getUserData.revenueQuery"]
      labels.forEach((label) => {
        const stat = PerformanceMonitor.getStats(label)
        if (stat) {
          allStats[label] = stat
        }
      })

      setStats(allStats)
    }, 1000)

    return () => clearInterval(interval)
  }, [isVisible])

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button onClick={() => setIsVisible(!isVisible)} variant="outline" size="sm" className="mb-2">
        {isVisible ? "Hide" : "Show"} Performance
      </Button>

      {isVisible && (
        <Card className="w-80 max-h-96 overflow-y-auto bg-black/90 text-white">
          <CardHeader>
            <CardTitle className="text-sm">Performance Monitor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats).map(([label, stat]) => (
              <div key={label} className="text-xs">
                <div className="font-mono font-bold">{label}</div>
                <div className="text-muted-foreground">
                  Avg: {stat.avg.toFixed(1)}ms | Max: {stat.max.toFixed(1)}ms | Count: {stat.count}
                </div>
              </div>
            ))}
            <Button
              onClick={() => PerformanceMonitor.logAllStats()}
              size="sm"
              variant="outline"
              className="w-full mt-2"
            >
              Log to Console
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
