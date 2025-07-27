import { createClient } from "@supabase/supabase-js"

// Admin client for server-side operations with service_role permissions.
// IMPORTANT: This should only be used in server-side code (Server Actions, Route Handlers).
// Do not expose the service_role key to the browser.
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase admin client environment variables are missing.")
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
