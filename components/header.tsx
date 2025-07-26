"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { connected } = useWallet()

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const scrollToSection = (sectionId: string) => {
    // If not on home page, navigate there first
    if (pathname !== "/") {
      router.push(`/#${sectionId}`)
      return
    }

    // If on home page, scroll to section
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
    setIsOpen(false)
  }

  const navigationItems = [
    {
      name: "How it Works",
      action: () => scrollToSection("how-it-works"),
      type: "scroll" as const,
    },
    {
      name: "Leaderboard",
      action: () => scrollToSection("leaderboard"),
      type: "scroll" as const,
    },
    ...(connected
      ? [
          {
            name: "Dashboard",
            href: "/dashboard",
            type: "link" as const,
          },
        ]
      : []),
  ]

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navigationItems.map((item) => {
        if (item.type === "scroll") {
          return (
            <Button
              key={item.name}
              variant="ghost"
              onClick={item.action}
              className={cn(
                "text-white hover:text-neon-pink transition-colors",
                mobile && "w-full justify-start text-left",
              )}
            >
              {item.name}
            </Button>
          )
        } else {
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href!}>
              <Button
                variant="ghost"
                className={cn(
                  "text-white hover:text-neon-pink transition-colors",
                  isActive && "text-neon-pink",
                  mobile && "w-full justify-start text-left",
                )}
                onClick={() => mobile && setIsOpen(false)}
              >
                {item.name}
              </Button>
            </Link>
          )
        }
      })}
    </>
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Image src="/logo.png" alt="StreamSketch" width={32} height={32} className="rounded" />
          <span className="text-xl font-bold text-white">StreamSketch</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <nav className="flex items-center space-x-4">
            <NavItems />
          </nav>
          <WalletMultiButton className="!bg-neon-pink hover:!bg-neon-pink/90 !text-white !border-none !rounded-md !px-4 !py-2 !text-sm !font-medium !transition-colors" />
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-2">
          <WalletMultiButton className="!bg-neon-pink hover:!bg-neon-pink/90 !text-white !border-none !rounded-md !px-3 !py-2 !text-xs !font-medium" />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:text-neon-pink">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-deep-space border-border/40">
              <div className="flex flex-col space-y-4 mt-8">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-lg font-semibold text-white">Menu</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:text-neon-pink"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <nav className="flex flex-col space-y-2">
                  <NavItems mobile />
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
