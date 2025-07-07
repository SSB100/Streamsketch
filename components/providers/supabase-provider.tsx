"use client"

import type React from "react"
import { createContext, useContext, useMemo } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type SupabaseContextType = {
  supabase: SupabaseClient
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  // Use useMemo to ensure the client is only created once per component lifecycle
  const supabaseClient = useMemo(() => {
    return createSupabaseBrowserClient()
  }, [])

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
