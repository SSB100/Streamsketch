/**
 * Server-only Supabase client using the **service-role** key.
 *
 * NOTE:
 * – Never import this in client components or browser code!
 * – We look for every possible env-var name that v0 workspaces expose so the
 *   function works no matter which one is configured.
 */
import "server-only"
import { createClient } from "@supabase/supabase-js"

export function createSupabaseAdminClient() {
  // Supabase URL fallbacks (first one found wins)
  const supabaseUrl =
    process.env.SUPABASE_SUPABASE_URL || // default in v0 workspaces
    process.env.NEXT_PUBLIC_SUPABASE_URL || // common public var
    process.env.SUPABASE_NEXT_PUBLIC_SUPABASE_URL

  // Service-role key fallbacks
  const serviceRoleKey =
    process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY || // default in v0 workspaces
    process.env.SUPABASE_SERVICE_ROLE_KEY // conventional name developers use

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin credentials. Make sure SUPABASE_SUPABASE_URL " +
        "and SUPABASE_SUPABASE_SERVICE_ROLE_KEY (or their NEXT_PUBLIC equivalents) " +
        "are configured in your project settings.",
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
