"use client"

import type React from "react"
import { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from "react"
import type { Drawing, Point } from "@/lib/types"
import { cn } from "@/lib/utils"

const BASE_WIDTH = 1280
const BASE_HEIGHT = 720

export interface CanvasHandle {
  clearCanvas: () => void
  addOptimisticDrawing: (drawing: Drawing) => void
  removeOptimisticDrawing: (tempId: number) => void
  confirmOptimisticDrawing: (tempId: number, serverDrawing: Drawing) => void
}

interface CanvasProps {
  width?: number
  height?: number
  initialDrawings?: Drawing[]
  isDrawable: boolean
  onDrawStart?: (line: Omit<Drawing["drawing_data"], "drawer_wallet_address">) => void
  onDrawEnd?: (line: Omit<Drawing["drawing_data"], "drawer_wallet_address">) => void
  color?: string
  lineWidth?: number
  className?: string
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(
  (
    {
      width: fixedWidth,
      height: fixedHeight,
      initialDrawings = [],
      isDrawable,
      onDrawStart,
      onDrawEnd,
      color = "#FFFFFF",
      lineWidth = 5,
      className,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [dimensions, setDimensions] = useState({
      width: fixedWidth || BASE_WIDTH,
      height: fixedHeight || BASE_HEIGHT,
    })
    const isDynamic = !fixedWidth

    const isDrawingRef = useRef(false)
    const currentPointsRef = useRef<Point[]>([])
    const optimisticDrawingsRef = useRef<Map<number, Drawing>>(new Map())

    const getScale = useCallback(() => {
      return {
        scaleX: dimensions.width / BASE_WIDTH,
        scaleY: dimensions.height / BASE_HEIGHT,
      }
    }, [dimensions])

    const drawLineOnContext = useCallback(
      (ctx: CanvasRenderingContext2D, points: Point[], lineColor: string, lineW: number) => {
        if (points.length < 2) return
        const { scaleX, scaleY } = getScale()

        ctx.beginPath()
        ctx.moveTo(points[0].x * scaleX, points[0].y * scaleY)
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x * scaleX, points[i].y * scaleY)
        }
        ctx.strokeStyle = lineColor
        ctx.lineWidth = lineW * Math.min(scaleX, scaleY)
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.stroke()
      },
      [getScale],
    )

    const redrawAll = useCallback(() => {
      const ctx = canvasRef.current?.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, dimensions.width, dimensions.height)

      // Draw confirmed drawings
      initialDrawings.forEach((d) => {
        drawLineOnContext(ctx, d.drawing_data.points, d.drawing_data.color, d.drawing_data.lineWidth)
      })

      // Draw optimistic drawings
      optimisticDrawingsRef.current.forEach((d) => {
        ctx.globalAlpha = 0.7
        drawLineOnContext(ctx, d.drawing_data.points, d.drawing_data.color, d.drawing_data.lineWidth)
        ctx.globalAlpha = 1.0
      })

      // Draw current line
      if (isDrawingRef.current && currentPointsRef.current.length > 1) {
        drawLineOnContext(ctx, currentPointsRef.current, color, lineWidth)
      }
    }, [dimensions, initialDrawings, color, lineWidth, drawLineOnContext])

    useEffect(() => {
      if (!isDynamic) return
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
    }, [isDynamic])

    useEffect(() => {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = dimensions.width
        canvas.height = dimensions.height
        redrawAll()
      }
    }, [dimensions, redrawAll])

    const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const { scaleX, scaleY } = getScale()
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
      return {
        x: (clientX - rect.left) / scaleX,
        y: (clientY - rect.top) / scaleY,
      }
    }

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawable || (onDrawStart && !onDrawStart({ points: [], color, lineWidth }))) return
      isDrawingRef.current = true
      const point = getPoint(e)
      currentPointsRef.current = [point]
    }

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingRef.current) return
      const point = getPoint(e)
      currentPointsRef.current.push(point)
      redrawAll()
    }

    const handleMouseUp = () => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false
      if (currentPointsRef.current.length > 1) {
        onDrawEnd?.({
          points: currentPointsRef.current,
          color,
          lineWidth,
        })
      }
      currentPointsRef.current = []
    }

    useImperativeHandle(ref, () => ({
      clearCanvas: () => {
        const ctx = canvasRef.current?.getContext("2d")
        if (ctx) {
          ctx.clearRect(0, 0, dimensions.width, dimensions.height)
        }
        initialDrawings.length = 0
        optimisticDrawingsRef.current.clear()
      },
      addOptimisticDrawing: (drawing: Drawing) => {
        optimisticDrawingsRef.current.set(drawing.id, drawing)
        redrawAll()
      },
      removeOptimisticDrawing: (tempId: number) => {
        optimisticDrawingsRef.current.delete(tempId)
        redrawAll()
      },
      confirmOptimisticDrawing: (tempId: number, serverDrawing: Drawing) => {
        optimisticDrawingsRef.current.delete(tempId)
        initialDrawings.push(serverDrawing)
        redrawAll()
      },
    }))

    return (
      <div ref={containerRef} className={cn("w-full h-full", { "aspect-[16/9]": !isDynamic })}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          className={cn("touch-none bg-black rounded-lg", className)}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    )
  },
)

Canvas.displayName = "Canvas"
