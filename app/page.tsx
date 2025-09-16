import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Leaderboard } from "@/components/leaderboard"
import { Header } from "@/components/header"
import { Palette, Users, Zap, Trophy, Rocket, Monitor, Tv, Projector, Gift, Heart, ArrowRight } from "lucide-react"
import Image from "next/image"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-deep-space via-purple-900/20 to-deep-space">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 via-transparent to-neon-pink/10" />
        <div className="relative mx-auto max-w-7xl text-center">
          <div className="mb-8 flex justify-center">
            <Image
              src="/banner.png"
              alt="StreamSketch Banner"
              width={400}
              height={200}
              className="rounded-lg shadow-2xl"
              priority
            />
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Interactive Drawing for{" "}
            <span className="bg-gradient-to-r from-neon-cyan to-neon-pink bg-clip-text text-transparent">
              Live Streams
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-3xl text-xl text-gray-300 sm:text-2xl">
            Let your viewers draw on a shared canvas in real-time. Create engaging, interactive experiences that bring
            your community together.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="bg-neon-pink text-white hover:bg-neon-pink/90" asChild>
              <Link href="/dashboard">
                Start Creating <Rocket className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 bg-transparent"
              asChild
            >
              <Link href="#how-it-works">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl mb-4">How It Works</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Simple steps to create interactive drawing experiences for your stream
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-white/5 border-border/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neon-cyan/20">
                  <Palette className="h-6 w-6 text-neon-cyan" />
                </div>
                <CardTitle className="text-white">1. Create Session</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Set up a drawing session with a unique code that your viewers can join
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-border/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neon-pink/20">
                  <Users className="h-6 w-6 text-neon-pink" />
                </div>
                <CardTitle className="text-white">2. Share Link</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Give your viewers the drawing link so they can participate in real-time
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-border/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                  <Zap className="h-6 w-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">3. Watch Magic</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  See drawings appear instantly on your stream as viewers create collaborative art
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-border/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
                  <Trophy className="h-6 w-6 text-green-400" />
                </div>
                <CardTitle className="text-white">4. Earn Together</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Streamers earn revenue share when viewers purchase premium features
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stream Integration Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-900/10 to-blue-900/10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl mb-4">
              Perfect for Your Stream Setup
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Multiple ways to integrate StreamSketch into your streaming workflow
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-16">
            <Card className="bg-white/5 border-border/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
                  <Monitor className="h-6 w-6 text-green-400" />
                </div>
                <CardTitle className="text-white">OBS Browser Source</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Add the canvas as an overlay in OBS Studio. Perfect for keeping the drawing visible while you stream
                  other content.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-border/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-500/20">
                  <Projector className="h-6 w-6 text-teal-400" />
                </div>
                <CardTitle className="text-white">Projector Background</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Project the canvas behind you for an immersive experience. Great for IRL streams and interactive
                  presentations.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-border/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                  <Tv className="h-6 w-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">Second Screen/TV</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Display on a separate monitor or TV visible in your stream. Perfect for desk setups and gaming
                  streams.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 md:grid-cols-2 mb-12">
            <Card className="bg-gradient-to-br from-neon-pink/10 to-purple-600/10 border-neon-pink/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neon-pink/20">
                  <Gift className="h-6 w-6 text-neon-pink" />
                </div>
                <CardTitle className="text-white">Give Away Free Credits</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Reward your loyal viewers with free drawing lines and nuke credits. Perfect for subscriber perks,
                  donations goals, or special events.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-neon-cyan/10 to-green-600/10 border-neon-cyan/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neon-cyan/20">
                  <Heart className="h-6 w-6 text-neon-cyan" />
                </div>
                <CardTitle className="text-white">Free Sessions Available</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Create completely free sessions for community events, art challenges, or just for fun. Viewers only
                  need the draw link to participate.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-neon-cyan to-neon-pink text-white hover:opacity-90"
              asChild
            >
              <Link href="/dashboard">
                Start Your First Session <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl mb-4">Top Earners</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              See who's leading the StreamSketch community in earnings
            </p>
          </div>
          <Leaderboard />
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-to-r from-neon-cyan/10 via-purple-600/10 to-neon-pink/10">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl mb-6">
            Ready to Transform Your Stream?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of streamers who are creating unforgettable interactive experiences with their communities.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="bg-neon-pink text-white hover:bg-neon-pink/90" asChild>
              <Link href="/dashboard">
                Get Started Now <Rocket className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="StreamSketch Logo" width={32} height={32} className="rounded" />
              <span className="text-lg font-bold text-white">StreamSketch</span>
            </div>
            <p className="text-sm text-gray-400">© 2024 StreamSketch. Interactive drawing for live streams.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
