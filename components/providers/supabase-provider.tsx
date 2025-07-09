"use client"

import type React from "react"

import { createContext, useContext, useState } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------
type SupabaseContextType = {
  supabase: SupabaseClient
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------
function SupabaseProvider({ children }: { children: React.ReactNode }) {
  // Use the singleton helper so we never create more than one instance.
  const [supabase] = useState(getSupabaseBrowserClient)

  return <SupabaseContext.Provider value={{ supabase }}>{children}</SupabaseContext.Provider>
}

// Export both a named and default export so either import style works.
export { SupabaseProvider }
export default SupabaseProvider

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------
export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error("useSupabase must be used within a SupabaseProvider")
  }
  return context.supabase
}
