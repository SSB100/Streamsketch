"use client"

interface ColorPickerProps {
  selectedColor: string
  onColorChange: (color: string) => void
}

const COLORS = ["#FFFFFF", "#34D399", "#2DD4BF", "#FFD700", "#FF4500", "#F472B6"]

export function ColorPicker({ selectedColor, onColorChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-gray-800 p-2">
      {COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onColorChange(color)}
          className={`h-8 w-8 rounded-full transition-transform duration-150 ${selectedColor === color ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-gray-800" : "hover:scale-110"}`}
          style={{ backgroundColor: color }}
          aria-label={`Select color ${color}`}
        />
      ))}
    </div>
  )
}
