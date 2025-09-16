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

    // Map to store optimistic drawings by their temporary ID
    const optimisticDrawingsRef = useRef<Map<number, Drawing>>(new Map())

    const getCanvasContext = () => canvasRef.current?.getContext("2d")

    // Helper to draw a single line on a given context
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

    // Redraws the main canvas: static layer + optimistic + current drawing
    const redrawAll = useCallback(() => {
      const ctx = getCanvasContext()
      const staticCtx = staticCtxRef.current
      const staticCanvas = staticCanvasRef.current

      if (!ctx || !staticCtx || !staticCanvas) return

      ctx.clearRect(0, 0, width, height)

      // Draw the pre-rendered static layer
      ctx.drawImage(staticCanvas, 0, 0)

      // Draw optimistic drawings on top (with transparency)
      optimisticDrawingsRef.current.forEach((d) => {
        const { points, color: lineColor, lineWidth: lineW } = d.drawing_data
        ctx.globalAlpha = 0.7 // Make optimistic lines slightly transparent
        drawLineOnContext(ctx, points, lineColor, lineW)
        ctx.globalAlpha = 1.0 // Reset alpha
      })

      // Draw the current line being drawn (if any)
      if (isDrawingRef.current && currentPointsRef.current.length > 1) {
        drawLineOnContext(ctx, currentPointsRef.current, color, lineWidth)
      }
    }, [width, height, color, lineWidth, drawLineOnContext])

    // Initialize canvases and contexts
    useEffect(() => {
      const mainCanvas = canvasRef.current
      if (!mainCanvas) return

      // Initialize static (off-screen) canvas
      if (typeof OffscreenCanvas !== "undefined") {
        staticCanvasRef.current = new OffscreenCanvas(width, height)
      } else {
        // Fallback for environments without OffscreenCanvas (e.g., older browsers, JSDOM)
        staticCanvasRef.current = document.createElement("canvas")
        staticCanvasRef.current.width = width
        staticCanvasRef.current.height = height
      }
      staticCtxRef.current = staticCanvasRef.current.getContext("2d")

      // Set initial canvas dimensions
      mainCanvas.width = width
      mainCanvas.height = height

      // Initial redraw
      redrawAll()

      // Cleanup function
      return () => {
        // No specific cleanup needed for OffscreenCanvas beyond GC
        // If using a regular canvas element for static, it would be removed from DOM
      }
    }, [width, height, redrawAll])

    // Update static canvas when initialDrawings change
    useEffect(() => {
      const staticCtx = staticCtxRef.current
      if (!staticCtx) return

      staticCtx.clearRect(0, 0, width, height)
      initialDrawings.forEach((d) => {
        const { points, color: lineColor, lineWidth: lineW } = d.drawing_data
        drawLineOnContext(staticCtx, points, lineColor, lineW)
      })
      redrawAll() // Redraw main canvas to reflect updated static layer
    }, [initialDrawings, width, height, redrawAll, drawLineOnContext])

    useImperativeHandle(ref, () => ({
      clearCanvas: () => {
        const ctx = getCanvasContext()
        const staticCtx = staticCtxRef.current
        if (ctx) ctx.clearRect(0, 0, width, height)
        if (staticCtx) staticCtx.clearRect(0, 0, width, height)
        optimisticDrawingsRef.current.clear()
        redrawAll() // Ensure main canvas is cleared
      },

      forceStopDrawing: () => {
        if (isDrawingRef.current && currentPointsRef.current.length > 1) {
          // Trigger the normal draw end process to save the line
          onDrawEnd({
            points: currentPointsRef.current,
            color,
            lineWidth,
          })
        }
        // Reset the drawing state
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

        // Draw the confirmed drawing onto the static layer
        const { points, color: lineColor, lineWidth: lineW } = serverDrawing.drawing_data
        drawLineOnContext(staticCtx, points, lineColor, lineW)

        // Remove from optimistic and redraw main canvas
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
        redrawAll() // Redraw to show the start of the new line
      }
    }

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingRef.current) return
      const currentPoint = getPoint(e)
      if (currentPoint) {
        currentPointsRef.current.push(currentPoint)
        redrawAll() // Redraw to show the updated current line
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
      redrawAll() // Final redraw after drawing ends
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
