"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bomb, Zap, Heart } from "lucide-react"
import { NUKE_ANIMATIONS, type NukeAnimation } from "@/lib/nuke-animations"
import Image from "next/image"

interface NukeSelectionDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onNuke: (animation: NukeAnimation) => void
  freeNukeCount: number
  isSessionFree?: boolean
}

export function NukeSelectionDialog({
  isOpen,
  onOpenChange,
  onNuke,
  freeNukeCount,
  isSessionFree = false,
}: NukeSelectionDialogProps) {
  const [selectedNuke, setSelectedNuke] = useState<NukeAnimation | null>(null)

  const handleNuke = () => {
    if (selectedNuke) {
      onNuke(selectedNuke)
      setSelectedNuke(null)
    }
  }

  const canUseNuke = (nuke: NukeAnimation) => {
    if (isSessionFree) return true
    if (nuke.id === "free_nuke") return freeNukeCount > 0
    return true // Paid nukes are always available if user has SOL
  }

  const getNukeButtonText = (nuke: NukeAnimation) => {
    if (isSessionFree) return "Use Nuke (Free)"
    if (nuke.id === "free_nuke") return `Use Free Nuke (${freeNukeCount} left)`
    return `Use Nuke (${nuke.price} SOL)`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-border/40 bg-deep-space">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Bomb className="h-5 w-5 text-neon-cyan" />
            {isSessionFree ? "Clear the Board" : "Choose Your Nuke"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {NUKE_ANIMATIONS.map((nuke) => (
            <div
              key={nuke.id}
              className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                selectedNuke?.id === nuke.id
                  ? "border-neon-cyan bg-neon-cyan/10"
                  : "border-border/40 bg-white/5 hover:border-border/60"
              }`}
              onClick={() => setSelectedNuke(nuke)}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-white">{nuke.name}</h3>
                {isSessionFree ? (
                  <Badge className="bg-green-500/20 text-green-400">
                    <Heart className="mr-1 h-3 w-3" />
                    Free
                  </Badge>
                ) : nuke.id === "free_nuke" ? (
                  <Badge className="bg-green-500/20 text-green-400">
                    <Zap className="mr-1 h-3 w-3" />
                    Free
                  </Badge>
                ) : (
                  <Badge className="bg-neon-pink/20 text-neon-pink">{nuke.price} SOL</Badge>
                )}
              </div>
              <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-black/50">
                <Image
                  src={nuke.previewImage || "/placeholder.svg"}
                  alt={nuke.name}
                  width={300}
                  height={169}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="text-sm text-gray-300">{nuke.description}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleNuke}
            disabled={!selectedNuke || !canUseNuke(selectedNuke)}
            className="bg-neon-cyan text-white hover:bg-neon-cyan/90"
          >
            <Bomb className="mr-2 h-4 w-4" />
            {selectedNuke ? getNukeButtonText(selectedNuke) : "Select a Nuke"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
