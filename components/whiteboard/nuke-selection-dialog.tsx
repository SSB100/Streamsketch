"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { NUKE_ANIMATIONS, type NukeAnimation } from "@/lib/nuke-animations"
import { Loader2 } from "lucide-react"
import Image from "next/image"
import { useWallet } from "@solana/wallet-adapter-react"

interface NukeSelectionDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onNuke: (animation: NukeAnimation) => Promise<void>
  freeNukeCount: number // Add new prop
}

export function NukeSelectionDialog({ isOpen, onOpenChange, onNuke, freeNukeCount }: NukeSelectionDialogProps) {
  const { publicKey } = useWallet()
  const [isNuking, setIsNuking] = useState<string | null>(null)
  const availableNukes = Object.values(NUKE_ANIMATIONS).filter((nuke) => nuke.id !== "default")
  const freeNukeAnim = availableNukes.find((nuke) => nuke.id === "free_nuke")
  const paidNukes = availableNukes.filter((nuke) => nuke.id !== "free_nuke")

  const handleSelect = async (animation: NukeAnimation) => {
    setIsNuking(animation.id)
    try {
      await onNuke(animation)
    } finally {
      setIsNuking(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-border/40 bg-deep-space">
        <DialogHeader>
          <DialogTitle className="text-white">Choose Your Nuke</DialogTitle>
          <DialogDescription>
            Select a nuke to clear the board. Free nukes don't require a transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-3">
          {freeNukeCount > 0 && freeNukeAnim && (
            <Card key={freeNukeAnim.id} className="overflow-hidden border-2 border-dashed border-green-400 bg-white/5">
              <CardContent className="flex flex-col p-4">
                <div className="relative mb-4 h-40 w-full overflow-hidden rounded-md bg-black">
                  <Image
                    src={freeNukeAnim.preview || "/placeholder.svg"}
                    alt={`${freeNukeAnim.name} Preview`}
                    layout="fill"
                    objectFit="cover"
                    className="opacity-40"
                  />
                  <div className="absolute inset-0 flex items-center justify-center p-2">
                    <p className="text-center text-lg font-bold text-white drop-shadow-lg">Free Use Tokens Only</p>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-green-400">{freeNukeAnim.name}</h3>
                <p className="text-sm text-muted-foreground">
                  You have: <span className="font-bold text-white">{freeNukeCount}</span>
                </p>
                <Button
                  onClick={() => handleSelect(freeNukeAnim)}
                  disabled={!!isNuking || !publicKey}
                  className="mt-4 w-full bg-green-500 text-white hover:bg-green-500/90"
                >
                  {isNuking === freeNukeAnim.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Use Free Nuke
                </Button>
              </CardContent>
            </Card>
          )}
          {paidNukes.map((anim) => (
            <Card key={anim.id} className="overflow-hidden border-border/20 bg-white/5">
              <CardContent className="flex flex-col p-4">
                <div className="relative mb-4 h-40 w-full overflow-hidden rounded-md bg-black">
                  <Image
                    src={anim.preview || "/placeholder.svg"}
                    alt={`${anim.name} Preview`}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <h3 className="text-lg font-bold text-white">{anim.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Price: <span className="font-bold text-white">{anim.price} SOL</span>
                </p>
                <Button onClick={() => handleSelect(anim)} disabled={!!isNuking || !publicKey} className="mt-4 w-full">
                  {isNuking === anim.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Purchase & Nuke
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
