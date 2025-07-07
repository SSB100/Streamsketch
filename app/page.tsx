"use client"

import { useRouter } from "next/navigation"
import React from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Users, Zap, Palette } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import Link from "next/link"

export default function HomePage() {
  const router = useRouter()
  const { connected } = useWallet()
  const [sessionCode, setSessionCode] = React.useState("")

  const handleJoinSession = (e: React.FormEvent) => {
    e.preventDefault()
    if (sessionCode.trim()) {
      router.push(`/session/${sessionCode.trim().toUpperCase()}/draw`)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative w-full overflow-hidden py-20 md:py-32 lg:py-40">
          <div className="absolute inset-0 z-0 bg-grid-white/[0.05] [mask-image:linear-gradient(to_bottom,white_5%,transparent_90%)]"></div>
          <div className="absolute inset-0 z-[-1] bg-gradient-to-b from-deep-space to-transparent"></div>
          <div className="container relative z-10">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-6xl font-extrabold tracking-tighter text-transparent sm:text-7xl md:text-8xl lg:text-9xl bg-clip-text bg-gradient-to-r from-brand-green to-brand-teal animate-gradient-pan">
                Stream Sketch
              </h1>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">for streamers</h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
                Turn your stream into a collaborative canvas. Let your viewers draw on your screen in real-time, funded
                by micro-transactions on Solana.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/dashboard">
                  <Button size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
                    {connected ? "Go to Dashboard" : "Connect Wallet to Start"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <form onSubmit={handleJoinSession} className="flex w-full gap-2 sm:w-auto">
                  <Input
                    type="text"
                    placeholder="Enter Session Code"
                    className="w-full sm:w-48"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value)}
                    maxLength={25} // Increased max length for NAME-CODE format
                    style={{ textTransform: "uppercase" }} // Visually transform text to uppercase
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary bg-transparent"
                  >
                    Join
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tighter text-white sm:text-4xl">How It Works</h2>
              <p className="mt-4 text-muted-foreground">A simple, powerful way to engage your community.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <Card className="border-primary/20 bg-white/5">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Palette className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-white">1. Create a Session</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Connect your wallet, go to your dashboard, and start a new whiteboard session. You'll get a unique
                    code for your viewers.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card className="border-secondary/20 bg-white/5">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                    <Users className="h-6 w-6 text-secondary" />
                  </div>
                  <CardTitle className="text-white">2. Viewers Join & Draw</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Viewers use the code to join. They purchase drawing credits with SOL to add their masterpiece to the
                    canvas.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card className="border-yellow-400/20 bg-white/5">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-400/10">
                    <Zap className="h-6 w-6 text-yellow-400" />
                  </div>
                  <CardTitle className="text-white">3. Earn Instantly</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    You earn 80% of all fees generated from drawing credits used in your session. Claim your SOL
                    earnings anytime from your dashboard.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border/40 py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} StreamSketch. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
