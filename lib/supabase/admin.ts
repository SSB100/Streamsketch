import { createServerClient } from "@supabase/ssr"

/**
 * Creates a Supabase client with service_role permissions.
 * This should ONLY be used on the server (in Server Actions and Route Handlers)
 * where you need to bypass RLS.
 *
 * @returns A Supabase client with admin privileges.
 */
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase URL or Service Role Key for admin client.")
  }

  // We can use createServerClient here with a dummy cookie implementation
  // as we don't need cookie-based auth when using the service_role key.
  return createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {},
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
