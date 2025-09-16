import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Leaderboard } from "@/components/leaderboard"
import { Header } from "@/components/header"
import Link from "next/link"
import Image from "next/image"
import {
  Zap,
  Users,
  Palette,
  Rocket,
  Monitor,
  Tv,
  Camera,
  Gift,
  Heart,
  DollarSign,
  Gamepad2,
  Sparkles,
  Target,
} from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-deep-space via-deep-space to-purple-900/20">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-pink/10 to-neon-cyan/10" />
        <div className="relative mx-auto max-w-7xl text-center">
          <div className="mb-8 flex justify-center">
            <Image src="/logo.png" alt="StreamSketch Logo" width={120} height={120} className="rounded-2xl" />
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-white sm:text-7xl">
            Interactive{" "}
            <span className="bg-gradient-to-r from-neon-pink to-neon-cyan bg-clip-text text-transparent">
              Whiteboard
            </span>{" "}
            for Streamers
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-300">
            Let your viewers draw on your stream in real-time. Create engaging, interactive content that brings your
            community together with collaborative drawing sessions.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="bg-neon-pink text-white hover:bg-neon-pink/90">
                <Rocket className="mr-2 h-5 w-5" />
                Start Streaming
              </Button>
            </Link>
            <Link href="/session/draw/DEMO-1234">
              <Button
                size="lg"
                variant="outline"
                className="border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 bg-transparent"
              >
                <Palette className="mr-2 h-5 w-5" />
                Try Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">How It Works</h2>
            <p className="mx-auto mb-12 max-w-2xl text-lg text-gray-300">
              Set up interactive whiteboards in minutes. Choose between free sessions for maximum engagement or paid
              sessions to monetize your content.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border-border/20 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-neon-pink/20">
                  <Users className="h-6 w-6 text-neon-pink" />
                </div>
                <CardTitle className="text-white">1. Create Session</CardTitle>
                <CardDescription>
                  Create a whiteboard session and choose between free or paid access. Get a unique code to share with
                  your viewers.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/20 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-neon-cyan/20">
                  <Monitor className="h-6 w-6 text-neon-cyan" />
                </div>
                <CardTitle className="text-white">2. Add to Stream</CardTitle>
                <CardDescription>
                  Add the whiteboard to your stream using OBS, a projector, or secondary display. Your viewers see
                  everything in real-time.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/20 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                  <Palette className="h-6 w-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">3. Viewers Draw</CardTitle>
                <CardDescription>
                  Viewers visit your site, enter the session code, and start drawing. Watch your community create art
                  together live on stream.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Perfect for Your Stream Setup */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Perfect for Your Stream Setup</h2>
            <p className="mx-auto mb-12 max-w-2xl text-lg text-gray-300">
              Multiple ways to integrate StreamSketch into your streaming workflow
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border-border/20 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
                  <Camera className="h-6 w-6 text-green-400" />
                </div>
                <CardTitle className="text-white">OBS Browser Source</CardTitle>
                <CardDescription>
                  Add the view link as a browser source in OBS. Perfect for overlays, full-screen segments, or
                  picture-in-picture setups.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/20 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
                  <Monitor className="h-6 w-6 text-blue-400" />
                </div>
                <CardTitle className="text-white">Projector Display</CardTitle>
                <CardDescription>
                  Project the whiteboard behind you for IRL streams. Great for art streams, educational content, or
                  interactive presentations.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/20 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                  <Tv className="h-6 w-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">Secondary Monitor/TV</CardTitle>
                <CardDescription>
                  Display on a second screen or TV in your streaming setup. Keep the whiteboard visible while you focus
                  on your main content.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Reward Your Community */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Reward Your Community</h2>
            <p className="mx-auto mb-12 max-w-2xl text-lg text-gray-300">
              Choose how your viewers interact with your whiteboard sessions
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="border-border/20 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
                  <Heart className="h-6 w-6 text-green-400" />
                </div>
                <CardTitle className="text-white">Free Sessions</CardTitle>
                <CardDescription>
                  Create completely free whiteboard sessions where anyone can draw and use nukes without any cost.
                  Perfect for maximum community engagement and inclusive content.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/20 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/20">
                  <Gift className="h-6 w-6 text-yellow-400" />
                </div>
                <CardTitle className="text-white">Gift Credits to Viewers</CardTitle>
                <CardDescription>
                  In paid sessions, reward your most active community members by gifting them free line credits and
                  nukes. Perfect for subscriber perks, donations rewards, or special events.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Powerful Features</h2>
            <p className="mx-auto mb-12 max-w-2xl text-lg text-gray-300">
              Everything you need to create engaging, interactive streaming content
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border/20 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Zap className="mr-2 h-5 w-5 text-neon-cyan" />
                  Real-time Drawing
                </CardTitle>
                <CardDescription>
                  Viewers draw directly on your stream with zero delay. See every stroke appear instantly.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/20 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Sparkles className="mr-2 h-5 w-5 text-neon-pink" />
                  Epic Nuke Animations
                </CardTitle>
                <CardDescription>
                  Clear the board with style using animated nukes. From cosmic blasts to spirit bombs.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/20 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <DollarSign className="mr-2 h-5 w-5 text-green-400" />
                  Monetization Ready
                </CardTitle>
                <CardDescription>
                  Earn revenue from viewer interactions. 80% of earnings go directly to streamers.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/20 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Palette className="mr-2 h-5 w-5 text-purple-400" />
                  Custom Colors & Brushes
                </CardTitle>
                <CardDescription>
                  Full color palette and adjustable brush sizes for detailed artwork and creative expression.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/20 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Target className="mr-2 h-5 w-5 text-red-400" />
                  Session Management
                </CardTitle>
                <CardDescription>
                  Create multiple sessions, manage access, and track your community's creative contributions.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/20 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Gamepad2 className="mr-2 h-5 w-5 text-blue-400" />
                  Leaderboards
                </CardTitle>
                <CardDescription>
                  Track top earners and most active community members with built-in leaderboard system.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Top Streamers</h2>
            <p className="mx-auto mb-12 max-w-2xl text-lg text-gray-300">
              See who's earning the most from their interactive streaming sessions
            </p>
          </div>
          <Suspense
            fallback={
              <Card className="border-border/20 bg-white/5">
                <CardContent className="p-8 text-center">
                  <div className="text-gray-400">Loading leaderboard...</div>
                </CardContent>
              </Card>
            }
          >
            <Leaderboard />
          </Suspense>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-4xl font-bold text-white sm:text-5xl">Ready to Transform Your Stream?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-300">
            Join streamers who are already creating more engaging, interactive content with their communities.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="bg-neon-pink text-white hover:bg-neon-pink/90">
                <Rocket className="mr-2 h-5 w-5" />
                Create Your First Session
              </Button>
            </Link>
            <Link href="/session/draw/DEMO-1234">
              <Button
                size="lg"
                variant="outline"
                className="border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 bg-transparent"
              >
                <Palette className="mr-2 h-5 w-5" />
                Try the Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="StreamSketch" width={32} height={32} className="rounded" />
              <span className="text-lg font-bold text-white">StreamSketch</span>
            </div>
            <div className="flex items-center gap-6">
              <Badge variant="secondary" className="bg-neon-pink/20 text-neon-pink">
                Powered by Solana
              </Badge>
              <p className="text-sm text-gray-400">© 2024 StreamSketch. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
