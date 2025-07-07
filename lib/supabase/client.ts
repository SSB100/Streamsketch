import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

// Global singleton instance
let globalClient: SupabaseClient | null = null
let isInitializing = false

/**
 * Creates and returns a singleton Supabase client for the browser.
 * This prevents the "Multiple GoTrueClient instances" warning by ensuring
 * that only ONE client exists across the entire application.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  // Always return existing client if it exists
  if (globalClient) {
    return globalClient
  }

  // Prevent race conditions during initialization
  if (isInitializing) {
    // Wait for initialization to complete
    let attempts = 0
    while (!globalClient && attempts < 100) {
      attempts++
      // Small delay to prevent busy waiting
      if (typeof window !== "undefined") {
        // Client-side: use setTimeout
        new Promise((resolve) => setTimeout(resolve, 10))
      }
    }
    if (globalClient) return globalClient
  }

  // Server-side: create a new instance each time (no singleton needed)
  if (typeof window === "undefined") {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables")
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }

  // Client-side: create singleton with race condition protection
  isInitializing = true

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    isInitializing = false
    throw new Error("Missing Supabase client-side environment variables")
  }

  // Create the singleton client with maximum performance optimizations
  globalClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Disable session persistence for speed
      autoRefreshToken: false, // Disable auto refresh for speed
      detectSessionInUrl: false, // Don't detect session in URL for speed
      flowType: "implicit", // Use faster auth flow
    },
    realtime: {
      params: {
        eventsPerSecond: 3, // Further reduce realtime events
      },
    },
    global: {
      headers: {
        "x-client-info": "streamsketch-v1",
      },
    },
    db: {
      schema: "public",
    },
  })

  isInitializing = false
  console.log("[Supabase] Singleton client created successfully")
  return globalClient
}

// Export a function to get the existing client (for debugging)
export function getExistingClient(): SupabaseClient | null {
  return globalClient
}

// Function to reset the client (for testing/debugging)
export function resetSupabaseClient(): void {
  if (globalClient && typeof window !== "undefined") {
    // Clean up the existing client
    globalClient.removeAllChannels?.()
    globalClient = null
    isInitializing = false
    console.log("[Supabase] Client reset")
  }
}
