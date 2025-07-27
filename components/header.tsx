"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "./ui/button"
import { Trophy, Lightbulb } from "lucide-react"

export function Header() {
  const { connected } = useWallet()
  const pathname = usePathname()
  const router = useRouter()

  const handleScrollTo = (id: string) => {
    if (pathname === "/") {
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
      }
    } else {
      router.push(`/#${id}`)
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="StreamSketch Logo" width={40} height={40} className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tighter text-white">StreamSketch</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="text-white hover:text-primary"
            onClick={() => handleScrollTo("how-it-works")}
          >
            <Lightbulb className="mr-2 h-4 w-4" />
            How It Works
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:text-yellow-400"
            onClick={() => handleScrollTo("leaderboard")}
          >
            <Trophy className="mr-2 h-4 w-4" />
            Leaderboard
          </Button>
          {connected && (
            <Link href="/dashboard">
              <Button variant="link" className="text-white hover:text-primary">
                Dashboard
              </Button>
            </Link>
          )}
          <WalletMultiButton
            style={{
              backgroundColor: "#34D399",
              color: "#0A0F0D",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              height: "40px",
            }}
          />
        </nav>
      </div>
    </header>
  )
}
