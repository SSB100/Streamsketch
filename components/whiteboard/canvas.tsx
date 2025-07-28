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
  forceStopDrawing: () => void
  addOptimisticDrawing: (drawing: Drawing) => void
  removeOptimisticDrawing: (tempId: number) => void
  confirmOptimisticDrawing: (tempId: number, serverDrawing: Drawing) => void
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
    const staticCanvasRef = useRef<HTMLCanvasElement | OffscreenCanvas | null>(null)
    const staticCtxRef = useRef<CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null>(null)

    const isDrawingRef = useRef(false)
    const currentPointsRef = useRef<Point[]>([])
    const optimisticDrawingsRef = useRef<Map<number, Drawing>>(new Map())

    const getCanvasContext = () => canvasRef.current?.getContext("2d")

    const drawLineOnContext = useCallback(
      (
        ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
        points: Point[],
        lineColor: string,
        lineW: number,
      ) => {
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
      },
      [],
    )

    const redrawAll = useCallback(() => {
      const ctx = getCanvasContext()
      const staticCtx = staticCtxRef.current
      const staticCanvas = staticCanvasRef.current

      if (!ctx || !staticCtx || !staticCanvas) return

      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(staticCanvas, 0, 0)

      optimisticDrawingsRef.current.forEach((d) => {
        const { points, color: lineColor, lineWidth: lineW } = d.drawing_data
        ctx.globalAlpha = 0.7
        drawLineOnContext(ctx, points, lineColor, lineW)
        ctx.globalAlpha = 1.0
      })

      if (isDrawingRef.current && currentPointsRef.current.length > 1) {
        drawLineOnContext(ctx, currentPointsRef.current, color, lineWidth)
      }
    }, [width, height, color, lineWidth, drawLineOnContext])

    useEffect(() => {
      const mainCanvas = canvasRef.current
      if (!mainCanvas) return

      if (typeof OffscreenCanvas !== "undefined") {
        staticCanvasRef.current = new OffscreenCanvas(width, height)
      } else {
        staticCanvasRef.current = document.createElement("canvas")
        staticCanvasRef.current.width = width
        staticCanvasRef.current.height = height
      }
      staticCtxRef.current = staticCanvasRef.current.getContext("2d")

      mainCanvas.width = width
      mainCanvas.height = height

      redrawAll()
    }, [width, height, redrawAll])

    useEffect(() => {
      const staticCtx = staticCtxRef.current
      if (!staticCtx) return

      staticCtx.clearRect(0, 0, width, height)
      initialDrawings.forEach((d) => {
        const { points, color: lineColor, lineWidth: lineW } = d.drawing_data
        drawLineOnContext(staticCtx, points, lineColor, lineW)
      })
      redrawAll()
    }, [initialDrawings, width, height, redrawAll, drawLineOnContext])

    useImperativeHandle(ref, () => ({
      clearCanvas: () => {
        const ctx = getCanvasContext()
        const staticCtx = staticCtxRef.current
        if (ctx) ctx.clearRect(0, 0, width, height)
        if (staticCtx) staticCtx.clearRect(0, 0, width, height)
        optimisticDrawingsRef.current.clear()
        redrawAll()
      },
      forceStopDrawing: () => {
        if (isDrawingRef.current && currentPointsRef.current.length > 1) {
          onDrawEnd({
            points: currentPointsRef.current,
            color,
            lineWidth,
          })
        }
        isDrawingRef.current = false
        currentPointsRef.current = []
        redrawAll()
      },
      addOptimisticDrawing: (drawing: Drawing) => {
        if (drawing.id) {
          optimisticDrawingsRef.current.set(drawing.id, drawing)
          redrawAll()
        }
      },
      removeOptimisticDrawing: (tempId: number) => {
        optimisticDrawingsRef.current.delete(tempId)
        redrawAll()
      },
      confirmOptimisticDrawing: (tempId: number, serverDrawing: Drawing) => {
        const staticCtx = staticCtxRef.current
        if (!staticCtx) return

        const { points, color: lineColor, lineWidth: lineW } = serverDrawing.drawing_data
        drawLineOnContext(staticCtx, points, lineColor, lineW)

        optimisticDrawingsRef.current.delete(tempId)
        redrawAll()
      },
    }))

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
        redrawAll()
      }
    }

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingRef.current) return
      const currentPoint = getPoint(e)
      if (currentPoint) {
        currentPointsRef.current.push(currentPoint)
        redrawAll()
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
      redrawAll()
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
