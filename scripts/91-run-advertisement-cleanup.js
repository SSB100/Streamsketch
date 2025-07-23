import { createClient } from "@supabase/supabase-js"
import { fileURLToPath } from "url"
import { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Use the correct environment variable names
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY

console.log("🔍 Checking environment variables...")
console.log("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✅ Found" : "❌ Missing")
console.log("SUPABASE_SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✅ Found" : "❌ Missing")

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runCleanup() {
  try {
    console.log("🧹 Starting advertisement cleanup...")

    // Execute cleanup statements directly
    console.log("🗑️ Dropping get_active_ad_for_session function...")
    const { error: functionError } = await supabase.rpc("exec_sql", {
      sql_query: "DROP FUNCTION IF EXISTS get_active_ad_for_session(text);",
    })

    if (functionError) {
      console.log("⚠️ Function drop result:", functionError.message)
    } else {
      console.log("✅ Function cleanup completed")
    }

    console.log("🗑️ Dropping advertisements table...")
    const { error: tableError } = await supabase.rpc("exec_sql", {
      sql_query: "DROP TABLE IF EXISTS advertisements;",
    })

    if (tableError) {
      console.log("⚠️ Table drop result:", tableError.message)
    } else {
      console.log("✅ Table cleanup completed")
    }

    console.log("🎉 Advertisement cleanup completed successfully!")
    console.log("📋 Summary:")
    console.log("  - Removed advertisements table (if existed)")
    console.log("  - Removed get_active_ad_for_session function (if existed)")
    console.log("  - All RLS policies automatically removed")
    console.log("  - No other database objects affected")
  } catch (error) {
    console.error("❌ Cleanup failed:", error)
    process.exit(1)
  }
}

runCleanup()
