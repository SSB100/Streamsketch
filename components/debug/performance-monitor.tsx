"use client"

import { useEffect, useState } from "react"
import { PerformanceMonitor } from "@/lib/performance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function PerformanceDebugPanel() {
  const [stats, setStats] = useState<Record<string, any>>({})
  const [isVisible, setIsVisible] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      const allStats: Record<string, any> = {}

      // Get all available stats
      const labels = [
        "getUserData",
        "spendDrawingCredit",
        "getUserData.optimizedQuery",
        "getUserData.userQuery",
        "getUserData.revenueQuery",
      ]
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

  const togglePerformanceMonitoring = () => {
    if (isEnabled) {
      PerformanceMonitor.forceDisable()
      setIsEnabled(false)
    } else {
      PerformanceMonitor.forceEnable()
      setIsEnabled(true)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex flex-col gap-2">
        <Button onClick={() => setIsVisible(!isVisible)} variant="outline" size="sm">
          {isVisible ? "Hide" : "Show"} Performance
        </Button>

        <Button onClick={togglePerformanceMonitoring} variant="outline" size="sm">
          {isEnabled ? "Disable" : "Enable"} Monitoring
        </Button>
      </div>

      {isVisible && (
        <Card className="w-80 max-h-96 overflow-y-auto bg-black/90 text-white mt-2">
          <CardHeader>
            <CardTitle className="text-sm">Performance Monitor {isEnabled ? "🟢" : "🔴"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.keys(stats).length === 0 ? (
              <div className="text-xs text-muted-foreground">
                {isEnabled ? "No performance data yet..." : "Monitoring disabled"}
              </div>
            ) : (
              Object.entries(stats).map(([label, stat]) => (
                <div key={label} className="text-xs">
                  <div className="font-mono font-bold">{label}</div>
                  <div className="text-muted-foreground">
                    Avg: {stat.avg.toFixed(1)}ms | Max: {stat.max.toFixed(1)}ms | Count: {stat.count}
                  </div>
                </div>
              ))
            )}
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
