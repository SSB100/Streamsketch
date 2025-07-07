export type NukeAnimation = {
  id: string
  name: string
  preview: string
  video?: string
  price: number // Added price property
}

export const NUKE_ANIMATIONS: Record<string, NukeAnimation> = {
  free_nuke: {
    id: "free_nuke",
    name: "Free Cosmic Blast",
    preview: "/previews/cosmic-blast.png",
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2817%29-VXKGi2kslJjCYf8YIDk8dDqiIEX08M.mp4",
    price: 0,
  },
  default: {
    id: "default",
    name: "Classic Flash",
    preview: "/previews/default-nuke.gif",
    video: undefined,
    price: 0.03, // Default price
  },
  cosmic_blast: {
    id: "cosmic_blast",
    name: "Cosmic Blast",
    preview: "/previews/cosmic-blast.png",
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2817%29-VXKGi2kslJjCYf8YIDk8dDqiIEX08M.mp4",
    price: 0.02, // New special price
  },
  rug_pull: {
    id: "rug_pull",
    name: "Rug Pull Nuke",
    preview: "/previews/rug-pull.png",
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2819%29-0dqGkRvX5b7pfZeFbsanw429CFl9Vq.mp4",
    price: 0.03,
  },
  pete_nuke: {
    id: "pete_nuke",
    name: "$PETE Nuke",
    preview: "/previews/pete-nuke.png",
    video:
      "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2821%29-iXLTzuZd09onb9o0wUvIzyOhkefjbm.mp4",
    price: 0.03,
  },
  spirit_bomb: {
    id: "spirit_bomb",
    name: "SPIRIT BOMB",
    preview: "/previews/spirit-bomb.png",
    video:
      "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2823%29-jblueUo9KzGlGWjJzsGKjF7D5ws7So.mp4",
    price: 0.03,
  },
  jericho: {
    id: "jericho",
    name: "The Jericho",
    preview: "/previews/jericho.png",
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2825%29-24XyOArI1bMNzUbxrCyASrZEqdONLq.mp4",
    price: 0.03,
  },
  rip_loki: {
    id: "rip_loki",
    name: "RIP LOKI",
    preview: "/previews/rip-loki.png",
    video: "https://hfjgo1ukrjb6miiq.public.blob.vercel-storage.com/Stream%20Sketch/Untitled%20video%20%2824%29-1nfwafYqQvoYnkog0y84dXGhYnKPWv.mp4",
    price: 0.03,
  },
}
