"use client"

import type React from "react"
import { useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react"
import type { Point, Drawing } from "@/lib/types"
import { cn } from "@/lib/utils"
import { groupBy } from "lodash"

interface CanvasProps {
  width: number
  height: number
  isDrawable: boolean
  initialDrawings?: Drawing[]
  onDraw: (drawing: Omit<Drawing, "drawer_wallet_address" | "id">) => void
  onDrawStart: () => void
  onDrawEnd: () => void
  color?: string
  lineWidth?: number
  className?: string
}

export interface CanvasHandle {
  clearCanvas: () => void
  drawBatchFromBroadcast: (drawings: Drawing[]) => void
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
    const isDrawingRef = useRef(false)
    const animationFrameRef = useRef<number | null>(null)
    const pendingDrawRef = useRef<Point | null>(null)

    const getCanvasContext = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const ctx = canvas.getContext("2d", {
        alpha: false,
        desynchronized: true,
        willReadFrequently: false,
      })
      if (ctx) {
        ctx.imageSmoothingEnabled = false
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
      }
      return ctx
    }, [])

    const drawLine = useCallback(
      (from: Point, to: Point) => {
        const ctx = getCanvasContext()
        if (!ctx) return
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        ctx.stroke()
      },
      [getCanvasContext, color, lineWidth],
    )

    const performDraw = useCallback(() => {
      if (!pendingDrawRef.current || !lastPointRef.current) return

      const currentPoint = pendingDrawRef.current
      drawLine(lastPointRef.current, currentPoint)

      onDraw({
        drawing_data: { from: lastPointRef.current, to: currentPoint, color, lineWidth },
      })

      lastPointRef.current = currentPoint
      pendingDrawRef.current = null
      animationFrameRef.current = null
    }, [color, lineWidth, onDraw, drawLine])

    const drawBatch = useCallback(
      (drawings: Drawing[]) => {
        const ctx = getCanvasContext()
        if (!ctx || drawings.length === 0) return

        // Group by color and line width for efficiency
        const batches = groupBy(drawings, (d) => `${d.drawing_data.color}-${d.drawing_data.lineWidth}`)

        for (const key in batches) {
          const batch = batches[key]
          const { color: batchColor, lineWidth: batchLineWidth } = batch[0].drawing_data
          ctx.beginPath()
          ctx.strokeStyle = batchColor
          ctx.lineWidth = batchLineWidth
          batch.forEach((d) => {
            ctx.moveTo(d.drawing_data.from.x, d.drawing_data.from.y)
            ctx.lineTo(d.drawing_data.to.x, d.drawing_data.to.y)
          })
          ctx.stroke()
        }
      },
      [getCanvasContext],
    )

    useImperativeHandle(ref, () => ({
      clearCanvas: () => {
        const ctx = getCanvasContext()
        if (ctx) {
          ctx.clearRect(0, 0, width, height)
        }
      },
      drawBatchFromBroadcast: (drawings: Drawing[]) => {
        drawBatch(drawings)
      },
      forceStopDrawing: () => {
        if (isDrawingRef.current) {
          isDrawingRef.current = false
          lastPointRef.current = null
          pendingDrawRef.current = null
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
            animationFrameRef.current = null
          }
          onDrawEnd()
        }
      },
    }))

    useEffect(() => {
      drawBatch(initialDrawings)
    }, [initialDrawings, drawBatch])

    const getPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point | null => {
      if (!canvasRef.current) return null
      const rect = canvasRef.current.getBoundingClientRect()
      const scaleX = canvasRef.current.width / rect.width
      const scaleY = canvasRef.current.height / rect.height
      const x = ("touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left) * scaleX
      const y = ("touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top) * scaleY
      return { x, y }
    }, [])

    const handleMouseDown = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawable) return
        isDrawingRef.current = true
        const point = getPoint(e)
        if (point) {
          lastPointRef.current = point
          onDrawStart()
        }
      },
      [isDrawable, getPoint, onDrawStart],
    )

    const handleMouseMove = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawingRef.current || !lastPointRef.current) return
        const currentPoint = getPoint(e)
        if (currentPoint) {
          pendingDrawRef.current = currentPoint
          if (!animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(performDraw)
          }
        }
      },
      [getPoint, performDraw],
    )

    const handleMouseUp = useCallback(() => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false
      lastPointRef.current = null
      pendingDrawRef.current = null
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      onDrawEnd()
    }, [onDrawEnd])

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
