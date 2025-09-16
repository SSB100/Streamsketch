// lib/supabase/admin.ts
//
// Server-side helpers (service-role key). DO NOT import from the browser.

import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

// --- singleton ---
let adminClient: SupabaseClient | undefined

function initAdminClient() {
  const supabaseUrl = process.env.SUPABASE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing.")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }, // Never persist sessions on the server
  })
}

/**
 * Returns a singleton Supabase client for server environments.
 * Call this from Route Handlers, Server Actions, etc.
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = initAdminClient()
  }
  return adminClient
}

/**
 * Legacy alias to satisfy older imports.
 */
export const createSupabaseAdminClient = getSupabaseServerClient

/**
 * Additional legacy alias.
 */
export const createSupabaseServerClient = getSupabaseServerClient
