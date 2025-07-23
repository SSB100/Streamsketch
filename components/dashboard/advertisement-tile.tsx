"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ImageIcon } from "lucide-react"

export function AdvertisementTile() {
  const [fileName, setFileName] = useState("")
  const [isEnabled, setIsEnabled] = useState(false)

  const canSave = fileName.trim().length > 0 && isEnabled

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-white/70" />
          Advertisement
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Label htmlFor="ad-toggle" className="text-sm text-white/60">
            {isEnabled ? "On" : "Off"}
          </Label>
          <Switch id="ad-toggle" checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ad-file" className="text-sm font-medium text-white/70">
            Advertisement File
          </Label>
          <Input
            id="ad-file"
            type="text"
            placeholder="Enter file name or path..."
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:ring-white/20"
          />
          <p className="text-xs text-white/50">Supported formats: PNG, JPG, GIF, MP4 up to 50MB</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2 text-sm text-white/60">
            <div className={`w-2 h-2 rounded-full ${isEnabled ? "bg-green-400" : "bg-white/30"}`} />
            <span>Status: {isEnabled ? "Active" : "Inactive"}</span>
          </div>
          <Button
            size="sm"
            disabled={!canSave}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              console.log("Save advertisement:", { fileName, isEnabled })
              // TODO: Connect to backend
            }}
          >
            Save Ad
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
