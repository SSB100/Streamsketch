import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

// This variable will hold the single instance of the Supabase client.
let client: SupabaseClient | undefined

/**
 * Creates and returns a singleton Supabase client for the browser.
 * This prevents the "Multiple GoTrueClient instances" warning by ensuring
 * that the client is initialized only once per browser session.
 */
function getSupabaseBrowserClient() {
  // If we're on the server, always create a new instance
  if (typeof window === "undefined") {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase environment variables not found. " +
          "Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
      )
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  // If the client has already been created, return the existing instance.
  if (client) {
    return client
  }

  // If the client doesn't exist, create it.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase client-side environment variables not found. " +
        "Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your Vercel project.",
    )
  }

  // Create the new client and store it in the module-level variable.
  client = createBrowserClient(supabaseUrl, supabaseAnonKey)

  return client
}

// Export under both names to ensure compatibility with all existing imports.
export { getSupabaseBrowserClient }
export const createSupabaseBrowserClient = getSupabaseBrowserClient
