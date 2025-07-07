"use client"

import { Slider } from "@/components/ui/slider"
import { Brush } from "lucide-react"

interface BrushSizePickerProps {
  size: number
  onSizeChange: (size: number) => void
}

export function BrushSizePicker({ size, onSizeChange }: BrushSizePickerProps) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-gray-800 px-4 py-2">
      <Brush className="h-4 w-4 text-white" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Size</span>
        <div className="w-20">
          <Slider
            value={[size]}
            onValueChange={(value) => onSizeChange(value[0])}
            max={20}
            min={1}
            step={1}
            className="cursor-pointer"
          />
        </div>
        <span className="w-6 text-xs text-white">{size}</span>
      </div>
    </div>
  )
}
