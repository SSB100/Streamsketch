"use client"

import { useCallback } from "react"

import type React from "react"
import { useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import type { Point, Drawing } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CanvasProps {
  width: number
  height: number
  isDrawable: boolean
  initialDrawings?: Drawing[]
  onDrawStart: () => boolean // Return true if drawing is allowed
  onDrawEnd: (line: Omit<Drawing["drawing_data"], "drawer_wallet_address">) => void
  color?: string
  lineWidth?: number
  className?: string
}

export interface CanvasHandle {
  clearCanvas: () => void
  drawFromBroadcast: (drawing: Drawing) => void // Kept for nuke/future real-time features
  forceStopDrawing: () => void
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(
  (
    {
      width,
      height,
      isDrawable,
      initialDrawings = [],
      onDrawStart,
      onDrawEnd,
      color = "#FFFFFF",
      lineWidth = 5,
      className,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawingRef = useRef(false)
    const currentPointsRef = useRef<Point[]>([])

    const getCanvasContext = () => canvasRef.current?.getContext("2d")

    const drawLine = (points: Point[], lineColor: string, lineW: number) => {
      const ctx = getCanvasContext()
      if (!ctx || points.length < 2) return
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.strokeStyle = lineColor
      ctx.lineWidth = lineW
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke()
    }

    const redrawAll = useCallback(
      (drawings: Drawing[]) => {
        const ctx = getCanvasContext()
        if (!ctx) return
        ctx.clearRect(0, 0, width, height)
        drawings.forEach((d) => {
          const { points, color: lineColor, lineWidth: lineW } = d.drawing_data
          drawLine(points, lineColor, lineW)
        })
      },
      [width, height],
    )

    useImperativeHandle(ref, () => ({
      clearCanvas: () => {
        const ctx = getCanvasContext()
        if (ctx) {
          ctx.clearRect(0, 0, width, height)
        }
      },
      drawFromBroadcast: (drawing: Drawing) => {
        const { points, color: lineColor, lineWidth: lineW } = drawing.drawing_data
        drawLine(points, lineColor, lineW)
      },
      forceStopDrawing: () => {
        if (isDrawingRef.current) {
          isDrawingRef.current = false
          currentPointsRef.current = []
        }
      },
    }))

    useEffect(() => {
      redrawAll(initialDrawings)
    }, [initialDrawings, redrawAll])

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
      if (!isDrawable || !onDrawStart()) return
      isDrawingRef.current = true
      const point = getPoint(e)
      if (point) {
        currentPointsRef.current = [point]
      }
    }

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingRef.current) return
      const currentPoint = getPoint(e)
      if (currentPoint && currentPointsRef.current.length > 0) {
        const lastPoint = currentPointsRef.current[currentPointsRef.current.length - 1]
        // Draw segment locally for responsiveness
        drawLine([lastPoint, currentPoint], color, lineWidth)
        currentPointsRef.current.push(currentPoint)
      }
    }

    const handleMouseUp = () => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false
      if (currentPointsRef.current.length > 1) {
        onDrawEnd({
          points: currentPointsRef.current,
          color,
          lineWidth,
        })
      }
      currentPointsRef.current = []
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
