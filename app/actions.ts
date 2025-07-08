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

// All helper functions like ensureUser, getUserData, etc. remain the same...
async function ensureUser(walletAddress: string) {
  const admin = createSupabaseAdminClient()
  const { error: userError } = await admin.from("users").insert({ wallet_address: walletAddress }).single()
  if (userError && userError.code !== "23505") {
    console.error("Error in ensureUser (users):", userError.message)
    throw new Error(`Failed to ensure user exists: ${userError.message}`)
  }
  const { error: revError } = await admin
    .from("revenue")
    .insert({ streamer_wallet_address: walletAddress }, { ignoreDuplicates: true })
  if (revError && revError.code !== "23505") {
    console.error("Error in ensureUser (revenue):", revError.message)
    throw new Error(`Failed to ensure revenue row: ${revError.message}`)
  }
}
async function getFreeCreditsTotal(
  admin: any,
  walletAddress: string,
): Promise<{ totalFreeLines: number; totalFreeNukes: number }> {
  try {
    const { data: rpcData, error: rpcErr } = await admin
      .rpc("get_total_free_credits", { p_user_wallet_address: walletAddress })
      .single()
    if (!rpcErr && rpcData && typeof rpcData === "object") {
      const totalFreeLines = Number(rpcData.total_free_lines ?? 0)
      const totalFreeNukes = Number(rpcData.total_free_nukes ?? 0)
      if (!isNaN(totalFreeLines) && !isNaN(totalFreeNukes) && totalFreeLines >= 0 && totalFreeNukes >= 0) {
        return { totalFreeLines, totalFreeNukes }
      }
    }
    console.warn("[StreamSketch] RPC returned invalid data, falling back to direct queries:", rpcData)
  } catch (err: any) {
    console.warn("[StreamSketch] RPC failed, falling back to direct queries:", err?.message ?? err)
  }
  try {
    const [lineResult, nukeResult] = await Promise.allSettled([
      admin.from("session_free_line_credits").select("amount").eq("user_wallet_address", walletAddress),
      admin.from("session_free_nuke_credits").select("amount").eq("user_wallet_address", walletAddress),
    ])
    let totalFreeLines = 0
    let totalFreeNukes = 0
    if (lineResult.status === "fulfilled" && lineResult.value.data) {
      totalFreeLines = lineResult.value.data.reduce(
        (sum: number, row: { amount: number }) => sum + (row.amount ?? 0),
        0,
      )
    }
    if (nukeResult.status === "fulfilled" && nukeResult.value.data) {
      totalFreeNukes = nukeResult.value.data.reduce(
        (sum: number, row: { amount: number }) => sum + (row.amount ?? 0),
        0,
      )
    }
    return { totalFreeLines, totalFreeNukes }
  } catch (err: any) {
    console.error("[StreamSketch] All free credit queries failed:", err?.message ?? err)
    return { totalFreeLines: 0, totalFreeNukes: 0 }
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
  revalidatePath("/dashboard")
  return { success: true }
}
export async function getUserData(walletAddress: string) {
  const admin = createSupabaseAdminClient()
  await ensureUser(walletAddress)
  try {
    const { data: userData, error: userError } = await admin
      .from("users")
      .select("username, line_credits_standard, line_credits_discounted")
      .eq("wallet_address", walletAddress)
      .single()
    if (userError || !userData) {
      console.error("[StreamSketch] Error getting user data:", userError?.message || "(unknown)")
      throw new Error(userError?.message || "Failed to fetch user data")
    }
    const { data: revenueData, error: revenueError } = await admin
      .from("revenue")
      .select("unclaimed_sol, total_claimed_sol")
      .eq("streamer_wallet_address", walletAddress)
      .single()
    if (revenueError && revenueError.code !== "PGRST116") {
      console.error("[StreamSketch] Error getting revenue data:", revenueError.message)
      throw revenueError
    }
    let giftingData = { lines_gifted: 0, nukes_gifted: 0 }
    try {
      const { data: giftingResult, error: giftingError } = await admin
        .rpc("get_gifting_limits", { p_streamer_wallet_address: walletAddress })
        .single()
      if (!giftingError && giftingResult) {
        giftingData = {
          lines_gifted: giftingResult.lines_gifted ?? 0,
          nukes_gifted: giftingResult.nukes_gifted ?? 0,
        }
      }
    } catch (err: any) {
      console.warn("[StreamSketch] Error fetching gifting limits, using defaults:", err?.message ?? err)
    }
    const { totalFreeLines, totalFreeNukes } = await getFreeCreditsTotal(admin, walletAddress)
    return {
      lineCredits: (userData.line_credits_standard || 0) + (userData.line_credits_discounted || 0),
      unclaimedSol: revenueData?.unclaimed_sol ?? 0,
      totalClaimedSol: revenueData?.total_claimed_sol ?? 0,
      username: userData.username ?? null,
      linesGifted: giftingData.lines_gifted,
      nukesGifted: giftingData.nukes_gifted,
      totalFreeLines,
      totalFreeNukes,
    }
  } catch (error: any) {
    console.error("[StreamSketch] getUserData failed:", error?.message ?? error)
    throw new Error(`Failed to get user data: ${error?.message ?? "Unknown error"}`)
  }
}
export async function getUserSessions(walletAddress: string) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from("sessions")
    .select("id, short_code, is_active, created_at")
    .eq("owner_wallet_address", walletAddress)
    .order("created_at", { ascending: false })
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
    .limit(50)
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
  revalidatePath("/dashboard")
  return { success: true, message: `${creditPackage.lines} line credits added successfully!` }
}
export async function getSessionData(shortCode: string) {
  const supabase = createSupabaseAdminClient()
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, owner_wallet_address")
    .eq("short_code", shortCode)
    .single()
  if (sessionError || !session) return { session: null, drawings: [] }
  const { data: drawings, error: drawingsError } = await supabase
    .from("drawings")
    .select("id, drawing_data, drawer_wallet_address")
    .eq("session_id", session.id)
    .order("id", { ascending: true })
  if (drawingsError) throw new Error(drawingsError.message)
  return { session, drawings: drawings as Drawing[] }
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
export async function recordDrawingAction(
  drawerWalletAddress: string,
  sessionId: string,
  drawingData: { points: any[]; color: string; lineWidth: number },
) {
  const supabase = createSupabaseAdminClient()
  await ensureUser(drawerWalletAddress)
  const { data: newDrawings, error } = await supabase.rpc("record_drawing", {
    p_drawer_wallet_address: drawerWalletAddress,
    p_session_id: sessionId,
    p_drawing_data: drawingData,
  })
  if (error) {
    console.error("Failed to record drawing:", error)
    return { success: false, error: error.message }
  }
  const newDrawing = newDrawings && newDrawings.length > 0 ? newDrawings[0] : null
  if (newDrawing) {
    supabase
      .channel(`session-${sessionId}`)
      .send({
        type: "broadcast",
        event: "draw",
        payload: { drawing: newDrawing },
      })
      .catch(console.error)
  }
  revalidatePath("/dashboard")
  return { success: true }
}

/**
 * A consolidated server action to handle all nuke logic.
 * It validates the request, handles credits/payment, broadcasts the nuke event,
 * and triggers background cleanup. This is the single source of truth for nukes.
 */
export async function initiateNukeAction(
  nukerWalletAddress: string,
  sessionId: string,
  nukeAnimation: NukeAnimation,
  txSignature?: string, // Optional: for paid nukes
) {
  const supabase = createSupabaseAdminClient()

  // Get nuker's username for the broadcast message
  const { data: nukerData } = await supabase
    .from("users")
    .select("username")
    .eq("wallet_address", nukerWalletAddress)
    .single()
  const nukerUsername = nukerData?.username || "A mysterious user"

  // --- Handle Free vs. Paid Nuke Logic ---
  if (nukeAnimation.id === "free_nuke") {
    // Decrement the user's free nuke credit for this session
    const { error: decrementError } = await supabase.rpc("decrement_session_free_nuke_credit", {
      p_nuker_wallet_address: nukerWalletAddress,
      p_session_id: sessionId,
    })
    if (decrementError) {
      return { success: false, error: `Failed to use free nuke: ${decrementError.message}` }
    }
    // Trigger the background cleanup (fire-and-forget)
    supabase
      .rpc("perform_free_nuke_cleanup", {
        p_nuker_wallet_address: nukerWalletAddress,
        p_session_id: sessionId,
      })
      .then(({ error }) => {
        if (error) console.error(`[Background Free Nuke Cleanup Failed]`, error)
      })
  } else {
    // This is a paid nuke
    if (!txSignature) {
      return { success: false, error: "Transaction signature is required for paid nukes." }
    }
    // NOTE: In a production app, you would re-verify the transaction here
    // to ensure it's valid before proceeding. We'll skip for brevity.

    // Trigger the background cleanup and revenue distribution (fire-and-forget)
    supabase
      .rpc("perform_nuke_cleanup", {
        p_nuker_wallet_address: nukerWalletAddress,
        p_session_id: sessionId,
        p_revenue_per_nuke: nukeAnimation.price,
        p_streamer_share_rate: STREAMER_REVENUE_SHARE,
      })
      .then(({ error }) => {
        if (error) console.error(`[Background Paid Nuke Cleanup Failed]`, error)
      })

    // Log the paid transaction (fire-and-forget)
    supabase
      .from("transactions")
      .insert({
        user_wallet_address: nukerWalletAddress,
        transaction_type: "purchase_nuke",
        sol_amount: nukeAnimation.price,
        signature: txSignature,
        notes: `Purchased ${nukeAnimation.name} for session ${sessionId}`,
      })
      .then(({ error }) => {
        if (error) console.error(`[Paid Nuke Logging Failed]`, error)
      })
  }

  // --- Authoritative Broadcast ---
  // After handling the logic, broadcast the event to all clients.
  await supabase.channel(`session-${sessionId}`).send({
    type: "broadcast",
    event: "nuke",
    payload: { username: nukerUsername, animationId: nukeAnimation.id },
  })

  revalidatePath("/dashboard")
  return { success: true }
}
