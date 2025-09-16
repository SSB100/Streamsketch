"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { NUKE_ANIMATIONS, type NukeAnimation } from "@/lib/nuke-animations"
import { Loader2, Heart } from "lucide-react"
import Image from "next/image"
import { useWallet } from "@solana/wallet-adapter-react"

interface NukeSelectionDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onNuke: (animation: NukeAnimation) => Promise<void>
  freeNukeCount: number
  isSessionFree?: boolean
}

// Reusable Nuke Card Component
const NukeCard = ({
  animation,
  isNuking,
  onSelect,
  isFree = false,
  freeNukeCount = 0,
  isDisabled,
  isSessionFree = false,
}: {
  animation: NukeAnimation
  isNuking: boolean
  onSelect: (animation: NukeAnimation) => void
  isFree?: boolean
  freeNukeCount?: number
  isDisabled: boolean
  isSessionFree?: boolean
}) => {
  const cardClass =
    isFree || isSessionFree ? "border-2 border-dashed border-green-400 bg-white/5" : "border-border/20 bg-white/5"
  const buttonClass = isFree || isSessionFree ? "bg-green-500 text-white hover:bg-green-500/90" : ""

  return (
    <Card key={animation.id} className={`overflow-hidden ${cardClass}`}>
      <CardContent className="flex h-full flex-col p-4">
        <div className="relative mb-4 h-40 w-full overflow-hidden rounded-md bg-black">
          <Image
            src={animation.preview || "/placeholder.svg"}
            alt={`${animation.name} Preview`}
            layout="fill"
            objectFit="cover"
            className={isFree && !isSessionFree ? "opacity-40" : ""}
          />
          {isFree && !isSessionFree && (
            <div className="absolute inset-0 flex items-center justify-center p-2">
              <p className="text-center text-lg font-bold text-white drop-shadow-lg">Free Use Tokens Only</p>
            </div>
          )}
          {isSessionFree && (
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1">
              <Heart className="h-3 w-3 text-green-400" />
              <span className="text-xs font-bold text-green-400">FREE</span>
            </div>
          )}
        </div>
        <div className="flex-grow">
          <h3 className={`text-lg font-bold ${isFree || isSessionFree ? "text-green-400" : "text-white"}`}>
            {animation.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isSessionFree ? (
              <span className="font-bold text-green-400">Free to use in this session</span>
            ) : isFree ? (
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
          {isSessionFree ? "Use for Free" : isFree ? "Use Free Nuke" : "Purchase & Nuke"}
        </Button>
      </CardContent>
    </Card>
  )
}

export function NukeSelectionDialog({
  isOpen,
  onOpenChange,
  onNuke,
  freeNukeCount,
  isSessionFree = false,
}: NukeSelectionDialogProps) {
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
          <DialogTitle className="text-white">
            {isSessionFree ? "Choose Your Board Clear Animation" : "Choose Your Nuke"}
          </DialogTitle>
          <DialogDescription>
            {isSessionFree
              ? "Select an animation to clear the board. All animations are free in this session!"
              : "Select a nuke to clear the board. The list is scrollable if there are many options."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-1 pr-4">
          {/* Free Nuke Section - only show if not a free session and user has free nukes */}
          {!isSessionFree && freeNukeCount > 0 && freeNukeAnim && (
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
                  isSessionFree={isSessionFree}
                />
              </div>
            </section>
          )}

          {/* Default Nuke Section */}
          {defaultNukeAnim && (
            <section>
              <h3 className="mb-4 border-b border-border/20 pb-2 text-xl font-bold text-white">
                {isSessionFree ? "Default Animation" : "Default Nuke"}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <NukeCard
                  animation={defaultNukeAnim}
                  isNuking={isNuking === defaultNukeAnim.id}
                  onSelect={handleSelect}
                  isDisabled={!!isNuking || !publicKey}
                  isSessionFree={isSessionFree}
                />
              </div>
            </section>
          )}

          {/* Premium Nukes Section */}
          {premiumNukes.length > 0 && (
            <section>
              <h3 className="mb-4 border-b border-border/20 pb-2 text-xl font-bold text-white">
                {isSessionFree ? "Premium Animations" : "Premium Nukes"}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {premiumNukes.map((anim) => (
                  <NukeCard
                    key={anim.id}
                    animation={anim}
                    isNuking={isNuking === anim.id}
                    onSelect={handleSelect}
                    isDisabled={!!isNuking || !publicKey}
                    isSessionFree={isSessionFree}
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
