"use server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import type { Drawing } from "@/lib/types"
import { STREAMER_REVENUE_SHARE, APP_WALLET_ADDRESS } from "@/lib/constants"
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js"
import bs58 from "bs58"
import type { NukeAnimation } from "@/lib/nuke-animations"
import { PURCHASE_PACKAGES } from "@/lib/packages"
import { timeAsync } from "@/lib/performance"

// Enhanced caching with longer duration and smarter invalidation
const userDataCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 60000 // Increased to 60 seconds for better performance

// Cache for session data to avoid repeated queries
const sessionDataCache = new Map<string, { data: any; timestamp: number }>()
const SESSION_CACHE_DURATION = 30000 // 30 seconds for session data

async function ensureUser(walletAddress: string) {
  const admin = createSupabaseAdminClient()
  const { data: user } = await admin.from("users").select("wallet_address").eq("wallet_address", walletAddress).single()

  if (!user) {
    const { error: insertError } = await admin
      .from("users")
      .insert({ wallet_address: walletAddress, line_credits_standard: 0, line_credits_discounted: 0 })
    if (insertError) {
      console.error("Error creating user:", insertError.message)
      throw new Error(insertError.message)
    }
    const { error: revenueInsertError } = await admin
      .from("revenue")
      .insert({ streamer_wallet_address: walletAddress, unclaimed_sol: 0, total_claimed_sol: 0 })
    if (revenueInsertError) {
      console.error("Error creating revenue entry:", revenueInsertError.message)
      throw new Error(revenueInsertError.message)
    }
  }
}

export async function updateUserUsername(walletAddress: string, newUsername: string) {
  const admin = createSupabaseAdminClient()
  const { error } = await admin.from("users").update({ username: newUsername }).eq("wallet_address", walletAddress)

  if (error) {
    if (error.code === "23505") return { success: false, error: "This username is already taken." }
    if (error.code === "23514") return { success: false, error: "Invalid username format (3-15 chars, A-Z, 0-9, _)." }
    return { success: false, error: error.message }
  }

  // Clear cache when username is updated
  userDataCache.delete(walletAddress)
  revalidatePath("/dashboard")
  return { success: true }
}

// Super optimized getUserData with enhanced caching
export async function getUserData(walletAddress: string) {
  return timeAsync("getUserData", async () => {
    // Check cache first with longer duration
    const cached = userDataCache.get(walletAddress)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("[Cache] Using cached user data for", walletAddress.slice(0, 8))
      return cached.data
    }

    const admin = createSupabaseAdminClient()
    await ensureUser(walletAddress)

    try {
      // Use the optimized function with timeout protection
      const { data, error } = await timeAsync("getUserData.optimizedQuery", () =>
        Promise.race([
          admin.rpc("refresh_user_stats", { p_wallet_address: walletAddress }).single(),
          new Promise(
            (_, reject) => setTimeout(() => reject(new Error("Query timeout")), 5000), // 5 second timeout
          ),
        ]),
      )

      if (error) {
        console.error("[StreamSketch] Optimized user query failed:", error.message)
        // Fallback to individual queries if the optimized one fails
        return await getUserDataFallback(admin, walletAddress)
      }

      const result = {
        lineCredits: data.total_line_credits || 0,
        unclaimedSol: data.unclaimed_sol || 0,
        totalClaimedSol: data.total_claimed_sol || 0,
        username: data.username || null,
        linesGifted: data.lines_gifted_this_week || 0,
        nukesGifted: data.nukes_gifted_this_week || 0,
        totalFreeLines: Number(data.total_free_lines) || 0,
        totalFreeNukes: Number(data.total_free_nukes) || 0,
      }

      // Cache the result with longer duration
      userDataCache.set(walletAddress, { data: result, timestamp: Date.now() })
      console.log("[Cache] Cached user data for", walletAddress.slice(0, 8))

      return result
    } catch (error: any) {
      console.error("[StreamSketch] getUserData failed:", error?.message ?? error)
      return await getUserDataFallback(admin, walletAddress)
    }
  })
}

// Optimized fallback function
async function getUserDataFallback(admin: any, walletAddress: string) {
  console.log("[Fallback] Using fast fallback queries for", walletAddress.slice(0, 8))

  try {
    // Only get essential data in fallback for speed
    const { data: userData } = await admin
      .from("users")
      .select("username, line_credits_standard, line_credits_discounted")
      .eq("wallet_address", walletAddress)
      .single()

    const { data: revenueData } = await admin
      .from("revenue")
      .select("unclaimed_sol, total_claimed_sol")
      .eq("streamer_wallet_address", walletAddress)
      .single()

    const result = {
      lineCredits: (userData?.line_credits_standard || 0) + (userData?.line_credits_discounted || 0),
      unclaimedSol: revenueData?.unclaimed_sol ?? 0,
      totalClaimedSol: revenueData?.total_claimed_sol ?? 0,
      username: userData?.username ?? null,
      linesGifted: 0, // Skip these in fallback for speed
      nukesGifted: 0,
      totalFreeLines: 0,
      totalFreeNukes: 0,
    }

    // Cache fallback result too
    userDataCache.set(walletAddress, { data: result, timestamp: Date.now() })
    return result
  } catch (error: any) {
    console.error("[StreamSketch] Fallback queries failed:", error?.message ?? error)
    return {
      lineCredits: 0,
      unclaimedSol: 0,
      totalClaimedSol: 0,
      username: null,
      linesGifted: 0,
      nukesGifted: 0,
      totalFreeLines: 0,
      totalFreeNukes: 0,
    }
  }
}

// Optimized session data with caching
export async function getSessionData(shortCode: string) {
  // Check cache first
  const cached = sessionDataCache.get(shortCode)
  if (cached && Date.now() - cached.timestamp < SESSION_CACHE_DURATION) {
    console.log("[Cache] Using cached session data for", shortCode)
    return cached.data
  }

  const supabase = createSupabaseAdminClient()
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, owner_wallet_address")
    .eq("short_code", shortCode)
    .single()

  if (sessionError || !session) {
    const result = { session: null, drawings: [] }
    sessionDataCache.set(shortCode, { data: result, timestamp: Date.now() })
    return result
  }

  const { data: drawings, error: drawingsError } = await supabase
    .from("drawings")
    .select("id, drawing_data, drawer_wallet_address")
    .eq("session_id", session.id)
    .order("id", { ascending: true })
    .limit(500) // Reduced limit for better performance

  if (drawingsError) throw new Error(drawingsError.message)

  const result = { session, drawings: drawings as Drawing[] }
  sessionDataCache.set(shortCode, { data: result, timestamp: Date.now() })
  return result
}

// Optimized drawing credit spending with minimal database calls
export async function spendDrawingCredit(drawerWalletAddress: string, sessionId: string, drawing: Omit<Drawing, "id">) {
  return timeAsync("spendDrawingCredit", async () => {
    const supabase = createSupabaseAdminClient()

    try {
      // Use a more efficient approach - just call the RPC without extra validation
      const { error } = await supabase.rpc("spend_credit_and_draw", {
        p_drawer_wallet_address: drawerWalletAddress,
        p_drawing_data: drawing.drawing_data,
        p_session_id: sessionId,
      })

      if (error) {
        console.error("[StreamSketch] Credit spend failed:", error.message)
        return { success: false, error: error.message }
      }

      // Clear cache after spending credit (but don't wait for it)
      setTimeout(() => userDataCache.delete(drawerWalletAddress), 0)
      return { success: true }
    } catch (error: any) {
      console.error("[StreamSketch] Credit spend error:", error?.message ?? error)
      return { success: false, error: error?.message ?? "Unknown error" }
    }
  })
}

// Clear cache when credits are updated
export async function processCreditPurchase(
  walletAddress: string,
  txSignature: string,
  packageId: keyof typeof PURCHASE_PACKAGES,
) {
  const admin = createSupabaseAdminClient()
  const creditPackage = PURCHASE_PACKAGES[packageId]

  if (!creditPackage) {
    return { success: false, error: "Invalid package selected." }
  }

  const rpcHost = process.env.SOLANA_RPC_HOST || process.env.NEXT_PUBLIC_SOLANA_RPC_HOST
  if (!rpcHost) {
    console.error("CRITICAL: SOLANA_RPC_HOST is not set.")
    return { success: false, error: "Service not configured." }
  }

  try {
    const connection = new Connection(rpcHost, "confirmed")
    const tx = await connection.getParsedTransaction(txSignature, { maxSupportedTransactionVersion: 0 })

    if (!tx) throw new Error("Transaction not found.")
    if (tx.meta?.err) throw new Error(`Transaction failed: ${JSON.stringify(tx.meta.err)}`)

    const transferInstruction = tx.transaction.message.instructions.find(
      (ix) => "parsed" in ix && ix.parsed.type === "transfer",
    ) as any

    if (!transferInstruction) throw new Error("No transfer instruction found.")

    const { source, destination, lamports } = transferInstruction.parsed.info
    const expectedLamports = creditPackage.price * LAMPORTS_PER_SOL

    if (source !== walletAddress) throw new Error("Transaction sent from wrong wallet.")
    if (destination !== APP_WALLET_ADDRESS.toBase58()) throw new Error("Transaction sent to wrong wallet.")
    if (lamports < expectedLamports * 0.99) throw new Error("Incorrect amount transferred.")
  } catch (error: any) {
    console.error(`Transaction verification failed for ${txSignature}:`, error.message)
    return { success: false, error: `Transaction verification failed: ${error.message}` }
  }

  await ensureUser(walletAddress)

  const { error: creditError } = await admin.rpc("add_line_credits", {
    p_wallet_address: walletAddress,
    p_standard_to_add: creditPackage.id === "small" ? creditPackage.lines : 0,
    p_discounted_to_add: creditPackage.id === "large" ? creditPackage.lines : 0,
  })

  if (creditError) {
    console.error("Failed to grant credits:", creditError)
    return { success: false, error: "Failed to update credit balance. Please contact support." }
  }

  const { error: logError } = await admin.from("transactions").insert({
    user_wallet_address: walletAddress,
    transaction_type: "purchase_lines",
    sol_amount: creditPackage.price,
    credit_amount: creditPackage.lines,
    signature: txSignature,
    notes: `Purchased ${creditPackage.name} (${creditPackage.lines} lines)`,
  })

  if (logError) {
    console.error(`Credit purchase by ${walletAddress} logged incompletely (sig: ${txSignature}):`, logError)
  }

  // Clear cache after purchase
  userDataCache.delete(walletAddress)
  revalidatePath("/dashboard")
  return { success: true, message: `${creditPackage.lines} line credits added successfully!` }
}

export async function getUserSessions(walletAddress: string) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from("sessions")
    .select("id, short_code, is_active, created_at")
    .eq("owner_wallet_address", walletAddress)
    .order("created_at", { ascending: false })
    .limit(20) // Limit to 20 most recent sessions

  if (error) throw new Error(error.message)
  return data
}

export async function getTransactionHistory(walletAddress: string) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from("transactions")
    .select("id, transaction_type, sol_amount, credit_amount, notes, created_at, signature")
    .eq("user_wallet_address", walletAddress)
    .order("created_at", { ascending: false })
    .limit(25) // Limit to 25 most recent transactions

  if (error) throw new Error(error.message)
  return data
}

export async function createSession(walletAddress: string, sessionName: string) {
  const admin = createSupabaseAdminClient()
  await ensureUser(walletAddress)

  const upperCaseName = sessionName.toUpperCase()
  if (!upperCaseName || upperCaseName.length < 3 || upperCaseName.length > 20) {
    return { success: false, error: "Name must be between 3 and 20 characters." }
  }
  if (!/^[A-Z0-9_-]+$/.test(upperCaseName)) {
    return { success: false, error: "Name can only contain letters, numbers, underscores, and hyphens." }
  }

  let finalCode = ""
  let isUnique = false
  let attempts = 0
  while (!isUnique && attempts < 10) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
    const candidateCode = `${upperCaseName}-${randomSuffix}`
    const { data: existing } = await admin
      .from("sessions")
      .select("short_code")
      .eq("short_code", candidateCode)
      .single()
    if (!existing) {
      isUnique = true
      finalCode = candidateCode
    }
    attempts++
  }

  if (!isUnique) {
    return { success: false, error: "Could not generate a unique session code. Please try a different name." }
  }

  const { data: newSession, error } = await admin
    .from("sessions")
    .insert({ owner_wallet_address: walletAddress, short_code: finalCode })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard")
  return { success: true, data: newSession }
}

export async function claimRevenueAction(walletAddress: string) {
  const supabase = createSupabaseAdminClient()
  const { data: claimedAmount, error: claimError } = await supabase.rpc("claim_all_revenue", {
    p_streamer_wallet_address: walletAddress,
  })

  if (claimError) {
    return { success: false, error: `Database claim failed: ${claimError.message}` }
  }
  if (!claimedAmount || claimedAmount <= 0) {
    return { success: false, error: "No revenue to claim." }
  }

  const secretKeyStr = process.env.APP_WALLET_SECRET_KEY
  if (!secretKeyStr) {
    console.error("CRITICAL: APP_WALLET_SECRET_KEY is not set.")
    return { success: false, error: "Payout service is not configured. Please contact support." }
  }

  const rpcHost = process.env.SOLANA_RPC_HOST || process.env.NEXT_PUBLIC_SOLANA_RPC_HOST
  if (!rpcHost) {
    console.error("CRITICAL: SOLANA_RPC_HOST is not set.")
    return { success: false, error: "RPC service is not configured. Please contact support." }
  }

  try {
    const connection = new Connection(rpcHost, "confirmed")
    const appKeypair = Keypair.fromSecretKey(bs58.decode(secretKeyStr))
    const streamerPublicKey = new PublicKey(walletAddress)

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: appKeypair.publicKey,
        toPubkey: streamerPublicKey,
        lamports: Math.floor(Number(claimedAmount) * LAMPORTS_PER_SOL),
      }),
    )

    const signature = await sendAndConfirmTransaction(connection, transaction, [appKeypair])

    const { error: logError } = await supabase.from("transactions").insert({
      user_wallet_address: walletAddress,
      transaction_type: "claim_revenue",
      sol_amount: claimedAmount,
      signature: signature,
      notes: `Payout of ${claimedAmount} SOL to ${walletAddress}`,
    })

    if (logError) {
      console.error(
        `CRITICAL: Payout for ${walletAddress} of ${claimedAmount} SOL succeeded (sig: ${signature}), but DB logging failed:`,
        logError,
      )
    }

    // Clear cache after claiming revenue
    userDataCache.delete(walletAddress)
    revalidatePath("/dashboard")
    return {
      success: true,
      message: `Successfully claimed and transferred ${Number(claimedAmount).toFixed(4)} SOL.`,
      signature: signature,
    }
  } catch (error: any) {
    console.error(
      `CRITICAL: On-chain payout for ${walletAddress} failed after claiming ${claimedAmount} SOL from DB.`,
      error,
    )
    return {
      success: false,
      error: `On-chain payout failed: ${error.message}. Please contact support to resolve the balance discrepancy.`,
    }
  }
}

export async function processNukePurchase(
  nukerWalletAddress: string,
  sessionId: string,
  nuke: NukeAnimation,
  signature: string,
) {
  const supabase = createSupabaseAdminClient()
  await ensureUser(nukerWalletAddress)

  const { error: cleanupError } = await supabase.rpc("perform_nuke_cleanup", {
    p_nuker_wallet_address: nukerWalletAddress,
    p_session_id: sessionId,
    p_revenue_per_nuke: nuke.price,
    p_streamer_share_rate: STREAMER_REVENUE_SHARE,
  })

  if (cleanupError) {
    console.error("Nuke cleanup RPC failed:", cleanupError)
    throw new Error(`Nuke cleanup failed: ${cleanupError.message}`)
  }

  const { error: logError } = await supabase.from("transactions").insert({
    user_wallet_address: nukerWalletAddress,
    transaction_type: "purchase_nuke",
    sol_amount: nuke.price,
    signature: signature,
    notes: `Purchased ${nuke.name} for session ${sessionId}`,
  })

  if (logError) {
    console.error(
      `Nuke purchase by ${nukerWalletAddress} succeeded (sig: ${signature}), but DB logging failed:`,
      logError,
    )
  }

  return { success: true }
}

export async function deleteSession(sessionId: string, walletAddress: string) {
  const admin = createSupabaseAdminClient()
  const { data: session, error: fetchError } = await admin
    .from("sessions")
    .select("owner_wallet_address")
    .eq("id", sessionId)
    .single()

  if (fetchError || !session) return { success: false, error: "Session not found." }
  if (session.owner_wallet_address !== walletAddress)
    return { success: false, error: "You are not authorized to delete this session." }

  const { error: deleteError } = await admin.from("sessions").delete().eq("id", sessionId)
  if (deleteError) return { success: false, error: deleteError.message }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function addDrawingSegments(
  sessionId: string,
  segments: { drawer_wallet_address: string; drawing_data: Omit<Drawing, "drawer_wallet_address" | "id"> }[],
) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.rpc("add_drawing_segments", {
    p_session_id: sessionId,
    p_segments: segments,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function giftCreditsToSessionAction(
  ownerWallet: string,
  sessionId: string,
  viewerWallet: string,
  lines: number,
  nukes: number,
) {
  if (lines <= 0 && nukes <= 0) {
    return { success: false, error: "You must gift at least one credit." }
  }
  if (lines < 0 || nukes < 0) {
    return { success: false, error: "Cannot gift a negative number of credits." }
  }

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.rpc("gift_credits_to_session", {
    p_owner_wallet: ownerWallet,
    p_session_id: sessionId,
    p_viewer_wallet: viewerWallet,
    p_lines_to_gift: lines,
    p_nukes_to_gift: nukes,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  // Clear cache for both users
  userDataCache.delete(ownerWallet)
  userDataCache.delete(viewerWallet)
  revalidatePath("/dashboard")
  return { success: true, message: data }
}

export async function getFreeCreditsForSession(userWallet: string, sessionId: string) {
  const admin = createSupabaseAdminClient()

  try {
    const { data, error } = await admin.rpc("get_session_free_credits", {
      p_user_wallet_address: userWallet,
      p_session_id: sessionId,
    })

    if (error) {
      console.warn("[StreamSketch] Error fetching session free credits:", error.message)
      return { freeLines: 0, freeNukes: 0 }
    }

    const result = Array.isArray(data) && data.length > 0 ? data[0] : null

    return {
      freeLines: result?.free_lines ?? 0,
      freeNukes: result?.free_nukes ?? 0,
    }
  } catch (error: any) {
    console.warn("[StreamSketch] Error fetching session free credits:", error?.message ?? error)
    return { freeLines: 0, freeNukes: 0 }
  }
}

export async function getUserFreeCreditSessions(userWallet: string) {
  const admin = createSupabaseAdminClient()

  try {
    const { data, error } = await admin.rpc("get_user_free_credit_sessions", {
      p_user_wallet_address: userWallet,
    })

    if (error) {
      console.warn("[StreamSketch] Error fetching free credit sessions:", error.message)
      return []
    }

    return data || []
  } catch (error: any) {
    console.warn("[StreamSketch] Error fetching free credit sessions:", error?.message ?? error)
    return []
  }
}

export async function triggerFreeNukeAction(nukerWalletAddress: string, sessionId: string) {
  const supabase = createSupabaseAdminClient()

  try {
    const { error: decrementError } = await supabase.rpc("decrement_session_free_nuke_credit", {
      p_nuker_wallet_address: nukerWalletAddress,
      p_session_id: sessionId,
    })

    if (decrementError) {
      return { success: false, error: `Failed to use free nuke: ${decrementError.message}` }
    }

    supabase
      .rpc("perform_free_nuke_cleanup", {
        p_nuker_wallet_address: nukerWalletAddress,
        p_session_id: sessionId,
      })
      .then(({ error }) => {
        if (error) {
          console.error(
            `[Background Free Nuke Cleanup Failed] User: ${nukerWalletAddress}, Session: ${sessionId}`,
            error,
          )
        }
      })

    return { success: true }
  } catch (error: any) {
    console.error("[StreamSketch] Free nuke action failed:", error?.message ?? error)
    return { success: false, error: `Failed to use free nuke: ${error?.message ?? "Unknown error"}` }
  }
}
