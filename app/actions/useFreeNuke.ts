"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function useFreeNuke(sessionCode: string) {
  return async (nukeType: string) => {
    const supabase = createSupabaseServerClient()

    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        return { success: false, error: "Authentication required" }
      }

      // Call the free nuke RPC function
      const { data, error } = await supabase.rpc("use_free_nuke", {
        p_session_code: sessionCode,
        p_nuke_type: nukeType,
        p_user_id: user.id,
      })

      if (error) {
        console.error("Free nuke error:", error)
        return { success: false, error: error.message }
      }

      if (!data.success) {
        return { success: false, error: data.error }
      }

      revalidatePath(`/session/draw/${sessionCode}`)
      return { success: true, free_nukes_remaining: data.free_nukes_remaining }
    } catch (error) {
      console.error("Free nuke action error:", error)
      return { success: false, error: "Failed to use free nuke" }
    }
  }
}
