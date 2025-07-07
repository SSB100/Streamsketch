import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/theme-provider"
import { AppWalletProvider } from "@/components/providers/wallet-provider"
import { SupabaseProvider } from "@/components/providers/supabase-provider"
import CustomCursor from "@/components/custom-cursor"
import { Toaster } from "@/components/ui/sonner"
import { ErrorBoundary } from "@/components/error-boundary"

export const metadata: Metadata = {
  title: "StreamSketch - Real-time Collaborative Whiteboard",
  description: "Monetize your stream with a real-time whiteboard powered by Solana.",
  icons: {
    icon: "/logo.png",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-deep-space font-sans antialiased", GeistSans.variable, GeistMono.variable)}>
        <ErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <SupabaseProvider>
              <AppWalletProvider>
                <CustomCursor />
                <div className="relative flex min-h-screen flex-col bg-background">{children}</div>
                <Toaster richColors />
              </AppWalletProvider>
            </SupabaseProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
