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
  freeNukeCount: number
}

// Reusable Nuke Card Component
const NukeCard = ({
  animation,
  isNuking,
  onSelect,
  isFree = false,
  freeNukeCount = 0,
  isDisabled,
}: {
  animation: NukeAnimation
  isNuking: boolean
  onSelect: (animation: NukeAnimation) => void
  isFree?: boolean
  freeNukeCount?: number
  isDisabled: boolean
}) => {
  const cardClass = isFree ? "border-2 border-dashed border-green-400 bg-white/5" : "border-border/20 bg-white/5"
  const buttonClass = isFree ? "bg-green-500 text-white hover:bg-green-500/90" : ""

  return (
    <Card key={animation.id} className={`overflow-hidden ${cardClass}`}>
      <CardContent className="flex h-full flex-col p-4">
        <div className="relative mb-4 h-40 w-full overflow-hidden rounded-md bg-black">
          <Image
            src={animation.preview || "/placeholder.svg"}
            alt={`${animation.name} Preview`}
            layout="fill"
            objectFit="cover"
            className={isFree ? "opacity-40" : ""}
          />
          {isFree && (
            <div className="absolute inset-0 flex items-center justify-center p-2">
              <p className="text-center text-lg font-bold text-white drop-shadow-lg">Free Use Tokens Only</p>
            </div>
          )}
        </div>
        <div className="flex-grow">
          <h3 className={`text-lg font-bold ${isFree ? "text-green-400" : "text-white"}`}>{animation.name}</h3>
          <p className="text-sm text-muted-foreground">
            {isFree ? (
              <>
                You have: <span className="font-bold text-white">{freeNukeCount}</span>
              </>
            ) : (
              <>
                Price: <span className="font-bold text-white">{animation.price} SOL</span>
              </>
            )}
          </p>
        </div>
        <Button onClick={() => onSelect(animation)} disabled={isDisabled} className={`mt-4 w-full ${buttonClass}`}>
          {isNuking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isFree ? "Use Free Nuke" : "Purchase & Nuke"}
        </Button>
      </CardContent>
    </Card>
  )
}

export function NukeSelectionDialog({ isOpen, onOpenChange, onNuke, freeNukeCount }: NukeSelectionDialogProps) {
  const { publicKey } = useWallet()
  const [isNuking, setIsNuking] = useState<string | null>(null)

  const allNukes = Object.values(NUKE_ANIMATIONS)
  const freeNukeAnim = allNukes.find((nuke) => nuke.id === "free_nuke")
  const defaultNukeAnim = allNukes.find((nuke) => nuke.id === "default")
  const premiumNukes = allNukes.filter((nuke) => nuke.id !== "free_nuke" && nuke.id !== "default")

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
            Select a nuke to clear the board. The list is scrollable if there are many options.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-1 pr-4">
          {/* Free Nuke Section */}
          {freeNukeCount > 0 && freeNukeAnim && (
            <section>
              <h3 className="mb-4 border-b border-border/20 pb-2 text-xl font-bold text-white">Free Nuke</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <NukeCard
                  animation={freeNukeAnim}
                  isNuking={isNuking === freeNukeAnim.id}
                  onSelect={handleSelect}
                  isFree={true}
                  freeNukeCount={freeNukeCount}
                  isDisabled={!!isNuking || !publicKey}
                />
              </div>
            </section>
          )}

          {/* Default Nuke Section */}
          {defaultNukeAnim && (
            <section>
              <h3 className="mb-4 border-b border-border/20 pb-2 text-xl font-bold text-white">Default Nuke</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <NukeCard
                  animation={defaultNukeAnim}
                  isNuking={isNuking === defaultNukeAnim.id}
                  onSelect={handleSelect}
                  isDisabled={!!isNuking || !publicKey}
                />
              </div>
            </section>
          )}

          {/* Premium Nukes Section */}
          {premiumNukes.length > 0 && (
            <section>
              <h3 className="mb-4 border-b border-border/20 pb-2 text-xl font-bold text-white">Premium Nukes</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {premiumNukes.map((anim) => (
                  <NukeCard
                    key={anim.id}
                    animation={anim}
                    isNuking={isNuking === anim.id}
                    onSelect={handleSelect}
                    isDisabled={!!isNuking || !publicKey}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
