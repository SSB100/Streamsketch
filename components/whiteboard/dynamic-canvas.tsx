"use client"
import { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from "react"
import type { Drawing } from "@/lib/types"
import { cn } from "@/lib/utils"

const BASE_WIDTH = 1280
const BASE_HEIGHT = 720

export interface DynamicCanvasHandle {
  clearCanvas: () => void
}

interface DynamicCanvasProps {
  initialDrawings?: Drawing[]
  className?: string
}

export const DynamicCanvas = forwardRef<DynamicCanvasHandle, DynamicCanvasProps>(
  ({ initialDrawings = [], className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [dimensions, setDimensions] = useState({ width: BASE_WIDTH, height: BASE_HEIGHT })

    const getScale = useCallback(() => {
      return {
        scaleX: dimensions.width / BASE_WIDTH,
        scaleY: dimensions.height / BASE_HEIGHT,
      }
    }, [dimensions])

    const drawSegment = useCallback(
      (ctx: CanvasRenderingContext2D, drawing: Drawing) => {
        const { scaleX, scaleY } = getScale()
        const { points, color, lineWidth } = drawing.drawing_data
        if (points.length < 2) return

        ctx.beginPath()
        ctx.moveTo(points[0].x * scaleX, points[0].y * scaleY)
        points.forEach((point) => {
          ctx.lineTo(point.x * scaleX, point.y * scaleY)
        })
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth * Math.min(scaleX, scaleY)
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.stroke()
      },
      [getScale],
    )

    const redrawAll = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, dimensions.width, dimensions.height)
      initialDrawings.forEach((drawing) => drawSegment(ctx, drawing))
    }, [dimensions.width, dimensions.height, initialDrawings, drawSegment])

    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          setDimensions({ width, height })
        }
      })

      resizeObserver.observe(container)
      return () => resizeObserver.disconnect()
    }, [])

    useEffect(() => {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = dimensions.width
        canvas.height = dimensions.height
        redrawAll()
      }
    }, [dimensions, redrawAll])

    useImperativeHandle(ref, () => ({
      clearCanvas: () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (ctx) {
          ctx.clearRect(0, 0, dimensions.width, dimensions.height)
        }
      },
    }))

    return (
      <div ref={containerRef} className={cn("w-full h-full", className)}>
        <canvas ref={canvasRef} className="touch-none bg-black rounded-lg" style={{ width: "100%", height: "100%" }} />
      </div>
    )
  },
)

DynamicCanvas.displayName = "DynamicCanvas"
