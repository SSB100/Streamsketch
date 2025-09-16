export interface NukeAnimation {
  id: string
  name: string
  price: number // in SOL
  video: string // Changed from videoPath to video
  preview: string // Changed from previewPath to preview
  description?: string
}

export const NUKE_ANIMATIONS: Record<string, NukeAnimation> = {
  free_nuke: {
    id: "free_nuke",
    name: "Free Nuke",
    price: 0,
    video: "/nukes/default-nuke.mp4",
    preview: "/previews/default-nuke.gif",
    description: "Clear the canvas for free (limited uses per session)",
  },
  default: {
    id: "default",
    name: "Default Nuke",
    price: 0.01,
    video: "", // No video for default - uses CSS animation
    preview: "/previews/default-nuke.gif",
    description: "Basic canvas clear with flash animation",
  },
  vortex: {
    id: "vortex",
    name: "Vortex",
    price: 0.02,
    video: "/nukes/vortex.mp4",
    preview: "/previews/vortex-nuke.gif",
    description: "A swirling vortex that consumes all drawings",
  },
  "cosmic-blast": {
    id: "cosmic-blast",
    name: "Cosmic Blast",
    price: 0.02,
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2817%29-VXKGi2kslJjCYf8YIDk8dDqiIEX08M.mp4",
    preview: "/previews/cosmic-blast.png",
    description: "An explosive cosmic force that obliterates everything",
  },
  "rug-pull": {
    id: "rug-pull",
    name: "Rug Pull",
    price: 0.02,
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2819%29-0dqGkRvX5b7pfZeFbsanw429CFl9Vq.mp4",
    preview: "/previews/rug-pull.png",
    description: "Pull the rug out from under all the drawings",
  },
  "pete-nuke": {
    id: "pete-nuke",
    name: "Pete Nuke",
    price: 0.02,
    video: "/nukes/pete-nuke.mp4",
    preview: "/previews/pete-nuke.png",
    description: "Pete's signature nuclear blast",
  },
  "spirit-bomb": {
    id: "spirit-bomb",
    name: "Spirit Bomb",
    price: 0.02,
    video: "/nukes/spirit-bomb.mp4",
    preview: "/previews/spirit-bomb.png",
    description: "Gather energy from all viewers to create a massive explosion",
  },
  jericho: {
    id: "jericho",
    name: "Jericho",
    price: 0.02,
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2825%29-24XyOArI1bMNzUbxrCyASrZEqdONLq.mp4",
    preview: "/previews/jericho.png",
    description: "Bring down the walls like the ancient city",
  },
  "rip-loki": {
    id: "rip-loki",
    name: "RIP Loki",
    price: 0.02,
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2824%29-1nfwafYqQvoYnkog0y84dXGhYnKPWv.mp4",
    preview: "/previews/rip-loki.png",
    description: "A tribute nuke in memory of Loki",
  },
}

export function getNukeAnimationById(id: string): NukeAnimation | undefined {
  return NUKE_ANIMATIONS[id]
}

export function getPaidNukeAnimations(): NukeAnimation[] {
  return Object.values(NUKE_ANIMATIONS).filter((nuke) => nuke.price > 0 && nuke.id !== "free_nuke")
}

export function getFreeNukeAnimation(): NukeAnimation | undefined {
  return NUKE_ANIMATIONS["free_nuke"]
}
