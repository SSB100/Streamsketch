"use client"

import type React from "react"
import { useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import type { Point, Drawing, Stroke } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CanvasProps {
  width: number
  height: number
  isDrawable: boolean
  initialDrawings?: Drawing[]
  onDrawStart: () => void
  onDrawEnd: (stroke: Stroke) => void
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
    const currentSegmentsRef = useRef<{ from: Point; to: Point }[]>([])

    const getCanvasContext = () => canvasRef.current?.getContext("2d")

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

    const drawStroke = (stroke: Stroke) => {
      stroke.segments.forEach((segment) => {
        drawLine(segment.from, segment.to, stroke.color, stroke.lineWidth)
      })
    }

    useImperativeHandle(ref, () => ({
      clearCanvas: () => {
        const ctx = getCanvasContext()
        if (ctx) {
          ctx.clearRect(0, 0, width, height)
        }
      },
      drawFromBroadcast: (drawing: Drawing) => {
        if (drawing && drawing.drawing_data && drawing.drawing_data.segments) {
          drawStroke(drawing.drawing_data)
        }
      },
      forceStopDrawing: () => {
        if (isDrawingRef.current) {
          isDrawingRef.current = false
          lastPointRef.current = null
          if (currentSegmentsRef.current.length > 0) {
            const stroke: Stroke = {
              color,
              lineWidth,
              segments: currentSegmentsRef.current,
            }
            onDrawEnd(stroke)
          }
          currentSegmentsRef.current = []
        }
      },
    }))

    useEffect(() => {
      const ctx = getCanvasContext()
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)
      initialDrawings.forEach((d) => {
        if (d && d.drawing_data && d.drawing_data.segments) {
          drawStroke(d.drawing_data)
        }
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
      currentSegmentsRef.current = []
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
        currentSegmentsRef.current.push({ from: lastPointRef.current, to: currentPoint })
        lastPointRef.current = currentPoint
      }
    }

    const handleMouseUp = () => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false
      lastPointRef.current = null
      if (currentSegmentsRef.current.length > 0) {
        const stroke: Stroke = {
          color,
          lineWidth,
          segments: currentSegmentsRef.current,
        }
        onDrawEnd(stroke)
      }
      currentSegmentsRef.current = []
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
