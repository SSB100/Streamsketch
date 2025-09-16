export interface NukeAnimation {
  id: string
  name: string
  video: string // Changed from videoPath to video
  preview: string // Changed from previewPath to preview
  price: number
  description: string
}

export const NUKE_ANIMATIONS: Record<string, NukeAnimation> = {
  "default-nuke": {
    id: "default-nuke",
    name: "Default Nuke",
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2817%29-VXKGi2kslJjCYf8YIDk8dDqiIEX08M.mp4",
    preview: "/previews/default-nuke.gif",
    price: 0.01,
    description: "Classic nuclear explosion effect",
  },
  vortex: {
    id: "vortex",
    name: "Vortex",
    video: "/nukes/vortex.mp4",
    preview: "/previews/vortex-nuke.gif",
    price: 0.02,
    description: "Swirling vortex that consumes everything",
  },
  "cosmic-blast": {
    id: "cosmic-blast",
    name: "Cosmic Blast",
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2817%29-VXKGi2kslJjCYf8YIDk8dDqiIEX08M.mp4",
    preview: "/previews/cosmic-blast.gif",
    price: 0.02,
    description: "Explosive cosmic energy blast",
  },
  "rug-pull": {
    id: "rug-pull",
    name: "Rug Pull",
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2819%29-0dqGkRvX5b7pfZeFbsanw429CFl9Vq.mp4",
    preview: "/previews/rug-pull.gif",
    price: 0.02,
    description: "The ultimate crypto rug pull animation",
  },
  "pete-nuke": {
    id: "pete-nuke",
    name: "Pete Nuke",
    video: "/nukes/pete-nuke.mp4",
    preview: "/previews/pete-nuke.png",
    price: 0.02,
    description: "Pete-themed nuclear explosion",
  },
  "spirit-bomb": {
    id: "spirit-bomb",
    name: "Spirit Bomb",
    video: "/nukes/spirit-bomb.mp4",
    preview: "/previews/spirit-bomb.png",
    price: 0.02,
    description: "Powerful spirit bomb attack",
  },
  jericho: {
    id: "jericho",
    name: "Jericho",
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2825%29-24XyOArI1bMNzUbxrCyASrZEqdONLq.mp4",
    preview: "/previews/jericho.png",
    price: 0.02,
    description: "Jericho-themed destruction",
  },
  "rip-loki": {
    id: "rip-loki",
    name: "RIP Loki",
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2824%29-1nfwafYqQvoYnkog0y84dXGhYnKPWv.mp4",
    preview: "/previews/rip-loki.png",
    price: 0.02,
    description: "Memorial tribute animation",
  },
}

export const getNukeAnimation = (id: string): NukeAnimation | undefined => {
  return NUKE_ANIMATIONS[id]
}

export const getAllNukeAnimations = (): NukeAnimation[] => {
  return Object.values(NUKE_ANIMATIONS)
}
