export interface NukeAnimation {
  id: string
  name: string
  price: number // in SOL
  videoPath: string
  previewPath: string
  description: string
}

export const NUKE_ANIMATIONS: NukeAnimation[] = [
  {
    id: "free_nuke",
    name: "Free Nuke",
    price: 0,
    videoPath: "/nukes/default-nuke.mp4",
    previewPath: "/previews/default-nuke.gif",
    description: "Clear the canvas for free (limited uses per session)",
  },
  {
    id: "vortex",
    name: "Vortex",
    price: 0.01, // Updated: 0.01 SOL for default nuke
    videoPath: "/nukes/vortex.mp4",
    previewPath: "/previews/vortex-nuke.gif",
    description: "A swirling vortex that consumes all drawings",
  },
  {
    id: "cosmic-blast",
    name: "Cosmic Blast",
    price: 0.02, // Updated: 0.02 SOL for custom nukes
    videoPath: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2817%29-VXKGi2kslJjCYf8YIDk8dDqiIEX08M.mp4",
    previewPath: "/previews/cosmic-blast.png",
    description: "An explosive cosmic force that obliterates everything",
  },
  {
    id: "rug-pull",
    name: "Rug Pull",
    price: 0.02, // Updated: 0.02 SOL for custom nukes
    videoPath: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2819%29-0dqGkRvX5b7pfZeFbsanw429CFl9Vq.mp4",
    previewPath: "/previews/rug-pull.png",
    description: "Pull the rug out from under all the drawings",
  },
  {
    id: "pete-nuke",
    name: "Pete Nuke",
    price: 0.02, // Updated: 0.02 SOL for custom nukes
    videoPath: "/nukes/pete-nuke.mp4",
    previewPath: "/previews/pete-nuke.png",
    description: "Pete's signature nuclear blast",
  },
  {
    id: "spirit-bomb",
    name: "Spirit Bomb",
    price: 0.02, // Updated: 0.02 SOL for custom nukes
    videoPath: "/nukes/spirit-bomb.mp4",
    previewPath: "/previews/spirit-bomb.png",
    description: "Gather energy from all viewers to create a massive explosion",
  },
  {
    id: "jericho",
    name: "Jericho",
    price: 0.02, // Updated: 0.02 SOL for custom nukes
    videoPath: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2825%29-24XyOArI1bMNzUbxrCyASrZEqdONLq.mp4",
    previewPath: "/previews/jericho.png",
    description: "Bring down the walls like the ancient city",
  },
  {
    id: "rip-loki",
    name: "RIP Loki",
    price: 0.02, // Updated: 0.02 SOL for custom nukes
    videoPath: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2824%29-1nfwafYqQvoYnkog0y84dXGhYnKPWv.mp4",
    previewPath: "/previews/rip-loki.png",
    description: "A tribute nuke in memory of Loki",
  },
]

export function getNukeAnimationById(id: string): NukeAnimation | undefined {
  return NUKE_ANIMATIONS.find((nuke) => nuke.id === id)
}

export function getPaidNukeAnimations(): NukeAnimation[] {
  return NUKE_ANIMATIONS.filter((nuke) => nuke.price > 0 && nuke.id !== "free_nuke")
}

export function getFreeNukeAnimation(): NukeAnimation | undefined {
  return NUKE_ANIMATIONS.find((nuke) => nuke.id === "free_nuke")
}
