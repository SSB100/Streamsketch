"use server"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function useFreeNuke(sessionCode: string, nukeType: string) {
  try {
    const supabase = createSupabaseAdminClient()

    // Call the RPC function to use a free nuke
    const { data, error } = await supabase.rpc("use_free_nuke", {
      p_session_code: sessionCode,
      p_nuke_type: nukeType,
    })

    if (error) {
      console.error("Error using free nuke:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/dashboard")
    return { success: true, data }
  } catch (error) {
    console.error("Error in useFreeNuke:", error)
    return { success: false, error: "Internal server error" }
  }
}
