"use client"

import type React from "react"
import { createContext, useContext, useMemo, useEffect } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createSupabaseBrowserClient, getExistingClient } from "@/lib/supabase/client"

type SupabaseContextType = {
  supabase: SupabaseClient
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  // Always use the same singleton client
  const supabaseClient = useMemo(() => {
    const existing = getExistingClient()
    if (existing) {
      console.log("[Supabase] Reusing existing client")
      return existing
    }
    console.log("[Supabase] Creating new singleton client")
    return createSupabaseBrowserClient()
  }, [])

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[Supabase] Provider initialized with client:", supabaseClient)
    }
  }, [supabaseClient])

  const contextValue = useMemo(
    () => ({
      supabase: supabaseClient,
    }),
    [supabaseClient],
  )

  return <SupabaseContext.Provider value={contextValue}>{children}</SupabaseContext.Provider>
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider")
  }
  return context.supabase
}
