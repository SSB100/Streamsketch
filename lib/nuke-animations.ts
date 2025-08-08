/**
 * Nuke animations catalog and pricing.
 * New pricing:
 *  - Default nuke: 0.01 SOL
 *  - Custom/premium nukes: 0.02 SOL
 *  - Free nuke: 0 SOL (consumes a free nuke credit)
 *
 * Video/preview assets referenced from /public.
 */

import { CUSTOM_NUKE_PRICE_SOL, DEFAULT_NUKE_PRICE_SOL } from "./constants"

export type NukeAnimation = {
  id:
    | "free_nuke"
    | "default"
    | "vortex"
    | "cosmic_blast"
    | "rug_pull"
    | "pete_nuke"
    | "spirit_bomb"
    | "jericho"
    | "rip_loki"
  name: string
  price: number // SOL
  // Preview image or GIF (for selection UI)
  preview?: string
  // Optional video path for the overlay playback
  video?: string
}

const FREE_PRICE = 0

export const NUKE_ANIMATIONS: Record<NukeAnimation["id"], NukeAnimation> = {
  free_nuke: {
    id: "free_nuke",
    name: "Free Nuke",
    price: FREE_PRICE,
    preview: "/previews/default-nuke.gif",
  },
  default: {
    id: "default",
    name: "Default Nuke",
    price: DEFAULT_NUKE_PRICE_SOL, // 0.01
    preview: "/previews/default-nuke.gif",
    // Default effect may be procedural; if you have a video, add it here:
    // video: "/nukes/default-nuke.mp4",
  },
  vortex: {
    id: "vortex",
    name: "Vortex",
    price: CUSTOM_NUKE_PRICE_SOL, // 0.02
    preview: "/previews/vortex-nuke.gif",
    video: "/nukes/vortex.mp4",
  },
  cosmic_blast: {
    id: "cosmic_blast",
    name: "Cosmic Blast",
    price: CUSTOM_NUKE_PRICE_SOL,
    preview: "/previews/cosmic-blast.png",
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2817%29-VXKGi2kslJjCYf8YIDk8dDqiIEX08M.mp4",
  },
  rug_pull: {
    id: "rug_pull",
    name: "Rug Pull",
    price: CUSTOM_NUKE_PRICE_SOL,
    preview: "/previews/rug-pull.png",
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2819%29-0dqGkRvX5b7pfZeFbsanw429CFl9Vq.mp4",
  },
  pete_nuke: {
    id: "pete_nuke",
    name: "Pete Nuke",
    price: CUSTOM_NUKE_PRICE_SOL,
    preview: "/previews/pete-nuke.png",
    video: "/nukes/pete-nuke.mp4",
  },
  spirit_bomb: {
    id: "spirit_bomb",
    name: "Spirit Bomb",
    price: CUSTOM_NUKE_PRICE_SOL,
    preview: "/previews/spirit-bomb.png",
    video: "/nukes/spirit-bomb.mp4",
  },
  jericho: {
    id: "jericho",
    name: "Jericho",
    price: CUSTOM_NUKE_PRICE_SOL,
    preview: "/previews/jericho.png",
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2825%29-24XyOArI1bMNzUbxrCyASrZEqdONLq.mp4",
  },
  rip_loki: {
    id: "rip_loki",
    name: "RIP Loki",
    price: CUSTOM_NUKE_PRICE_SOL,
    preview: "/previews/rip-loki.png",
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2824%29-1nfwafYqQvoYnkog0y84dXGhYnKPWv.mp4",
  },
}
