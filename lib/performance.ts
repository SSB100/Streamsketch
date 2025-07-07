// Enhanced performance monitoring utilities that work in both client and server
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map()
  private static _isEnabled: boolean | null = null

  // Safely check if we're in development mode
  private static get isEnabled(): boolean {
    if (this._isEnabled === null) {
      try {
        // Try to access NODE_ENV safely
        this._isEnabled = typeof process !== "undefined" && process.env?.NODE_ENV === "development"
      } catch {
        // If we can't access NODE_ENV (client-side), default to false
        this._isEnabled = false
      }
    }
    return this._isEnabled
  }

  static startTimer(label: string): () => void {
    if (!this.isEnabled) return () => {}

    const start = performance.now()

    return () => {
      const duration = performance.now() - start
      this.recordMetric(label, duration)

      // Log slow operations (> 50ms for better sensitivity)
      if (duration > 50) {
        console.warn(`[Perf] Slow operation: ${label} took ${duration.toFixed(2)}ms`)
      } else if (duration < 10) {
        console.log(`[Perf] Fast operation: ${label} took ${duration.toFixed(2)}ms`)
      }
    }
  }

  static recordMetric(label: string, value: number): void {
    if (!this.isEnabled) return

    if (!this.metrics.has(label)) {
      this.metrics.set(label, [])
    }

    const values = this.metrics.get(label)!
    values.push(value)

    // Keep only last 50 measurements for memory efficiency
    if (values.length > 50) {
      values.shift()
    }
  }

  static getStats(label: string): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(label)
    if (!values || values.length === 0) return null

    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    }
  }

  static logAllStats(): void {
    if (!this.isEnabled) return

    console.group("[Performance Stats]")
    for (const [label, _] of this.metrics) {
      const stats = this.getStats(label)
      if (stats) {
        const color = stats.avg > 100 ? "🔴" : stats.avg > 50 ? "🟡" : "🟢"
        console.log(
          `${color} ${label}: avg=${stats.avg.toFixed(2)}ms, min=${stats.min.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms, count=${stats.count}`,
        )
      }
    }
    console.groupEnd()
  }

  static clearStats(): void {
    this.metrics.clear()
  }

  // Force enable for debugging (call from browser console)
  static forceEnable(): void {
    this._isEnabled = true
    console.log("[Perf] Performance monitoring force-enabled")
  }

  // Force disable
  static forceDisable(): void {
    this._isEnabled = false
    console.log("[Perf] Performance monitoring disabled")
  }
}

// Utility for timing async operations
export async function timeAsync<T>(label: string, operation: () => Promise<T>): Promise<T> {
  const endTimer = PerformanceMonitor.startTimer(label)
  try {
    const result = await operation()
    return result
  } finally {
    endTimer()
  }
}

// Utility for timing sync operations
export function timeSync<T>(label: string, operation: () => T): T {
  const endTimer = PerformanceMonitor.startTimer(label)
  try {
    return operation()
  } finally {
    endTimer()
  }
}
