import { createClient } from "@supabase/supabase-js"

// ❶ Admin client – SERVER-ONLY!
//    • Uses the service-role key (full DB privileges)
//    • Does NOT persist a session; every call is stateless.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.SUPABASE_SUPABASE_URL!,
    process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY!, // NEVER expose this key to the browser
    {
      auth: { persistSession: false },
    },
  )
}
