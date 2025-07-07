"use client"

import type React from "react"
import { useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import type { Point, Drawing } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CanvasProps {
  width: number
  height: number
  isDrawable: boolean
  initialDrawings?: Drawing[]
  onDraw: (drawing: Omit<Drawing, "drawer_wallet_address">) => void
  onDrawStart: () => void
  onDrawEnd: () => void
  color?: string
  lineWidth?: number
  className?: string
}

export interface CanvasHandle {
  clearCanvas: () => void
  drawFromBroadcast: (drawing: Drawing) => void
  forceStopDrawing: () => void
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(
  (
    {
      width,
      height,
      isDrawable,
      initialDrawings = [],
      onDraw,
      onDrawStart,
      onDrawEnd,
      color = "#FFFFFF",
      lineWidth = 5,
      className,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const lastPointRef = useRef<Point | null>(null)
    const isDrawingRef = useRef(false) // Internal state to track mouse down

    const getCanvasContext = () => {
      const canvas = canvasRef.current
      if (!canvas) return null

      // Get context with performance optimizations
      const ctx = canvas.getContext("2d", {
        alpha: false, // Disable alpha channel for better performance
        desynchronized: true, // Allow async rendering
        willReadFrequently: false, // We don't read pixels frequently
      })

      if (ctx) {
        // Optimize rendering settings
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "low" // Faster rendering
      }

      return ctx
    }

    const drawLine = (from: Point, to: Point, lineColor: string, lineW: number) => {
      const ctx = getCanvasContext()
      if (!ctx) return
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.strokeStyle = lineColor
      ctx.lineWidth = lineW
      ctx.lineCap = "round"
      ctx.stroke()
    }

    useImperativeHandle(ref, () => ({
      clearCanvas: () => {
        const ctx = getCanvasContext()
        if (ctx) {
          ctx.clearRect(0, 0, width, height)
        }
      },
      drawFromBroadcast: (drawing: Drawing) => {
        const { from, to, color: lineColor, lineWidth: lineW } = drawing.drawing_data
        drawLine(from, to, lineColor, lineW)
      },
      forceStopDrawing: () => {
        if (isDrawingRef.current) {
          isDrawingRef.current = false
          lastPointRef.current = null
          onDrawEnd() // Trigger the parent's end-of-draw logic
        }
      },
    }))

    useEffect(() => {
      const ctx = getCanvasContext()
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)
      initialDrawings.forEach((d) => {
        const { from, to, color: lineColor, lineWidth: lineW } = d.drawing_data
        drawLine(from, to, lineColor, lineW)
      })
    }, [initialDrawings, width, height])

    const getPoint = (e: React.MouseEvent | React.TouchEvent): Point | null => {
      if (!canvasRef.current) return null
      const rect = canvasRef.current.getBoundingClientRect()
      const scaleX = canvasRef.current.width / rect.width
      const scaleY = canvasRef.current.height / rect.height
      const x = ("touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left) * scaleX
      const y = ("touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top) * scaleY
      return { x, y }
    }

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawable) return
      isDrawingRef.current = true
      const point = getPoint(e)
      if (point) {
        lastPointRef.current = point
        onDrawStart()
      }
    }

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingRef.current || !lastPointRef.current) return
      const currentPoint = getPoint(e)
      if (currentPoint) {
        drawLine(lastPointRef.current, currentPoint, color, lineWidth)
        onDraw({
          drawing_data: { from: lastPointRef.current, to: currentPoint, color, lineWidth },
        })
        lastPointRef.current = currentPoint
      }
    }

    const handleMouseUp = () => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false
      lastPointRef.current = null
      onDrawEnd()
    }

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={cn("rounded-lg border-2 border-dashed border-border/20 bg-black", className)}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        style={{ touchAction: "none" }}
      />
    )
  },
)

Canvas.displayName = "Canvas"
