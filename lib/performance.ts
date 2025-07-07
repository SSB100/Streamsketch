// Free performance monitoring utilities
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map()

  static startTimer(label: string): () => void {
    const start = performance.now()

    return () => {
      const duration = performance.now() - start
      this.recordMetric(label, duration)

      // Log slow operations (> 100ms)
      if (duration > 100) {
        console.warn(`[Perf] Slow operation: ${label} took ${duration.toFixed(2)}ms`)
      }
    }
  }

  static recordMetric(label: string, value: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, [])
    }

    const values = this.metrics.get(label)!
    values.push(value)

    // Keep only last 100 measurements
    if (values.length > 100) {
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
    console.group("[Performance Stats]")
    for (const [label, _] of this.metrics) {
      const stats = this.getStats(label)
      if (stats) {
        console.log(
          `${label}: avg=${stats.avg.toFixed(2)}ms, min=${stats.min.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms, count=${stats.count}`,
        )
      }
    }
    console.groupEnd()
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
