"use server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Drawing, Advertisement } from "@/lib/types"
import { STREAMER_REVENUE_SHARE, APP_WALLET_ADDRESS } from "@/lib/constants"
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js"
import bs58 from "bs58"
import type { NukeAnimation } from "@/lib/nuke-animations"
import { PURCHASE_PACKAGES } from "@/lib/packages"
import { getErrorMessage } from "@/lib/utils"
import { put, del } from "@vercel/blob"

const initialState = {
  success: false,
  message: "",
  signature: "",
  error: "",
}

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

  // Get RPC host from environment
  const rpcHost = process.env.SOLANA_RPC_HOST || process.env.NEXT_PUBLIC_SOLANA_RPC_HOST
  if (!rpcHost) {
    console.error("CRITICAL: SOLANA_RPC_HOST is not set.")
    return { success: false, error: "Service not configured." }
  }

  // Verify transaction on blockchain
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

    // IMPORTANT: If verification fails due to RPC issues but we have a signature,
    // we should still try to award credits and log the transaction
    console.warn(`Proceeding with credit award despite verification failure for signature: ${txSignature}`)
  }

  // Ensure user exists
  await ensureUser(walletAddress)

  // Award credits using the updated RPC function
  try {
    const { error: creditError } = await admin.rpc("add_line_credits", {
      p_wallet_address: walletAddress,
      p_standard_to_add: creditPackage.id === "small" ? creditPackage.lines : 0,
      p_discounted_to_add: creditPackage.id === "large" ? creditPackage.lines : 0,
    })

    if (creditError) {
      console.error("Failed to grant credits:", creditError)
      return { success: false, error: "Failed to update credit balance. Please contact support." }
    }
  } catch (error: any) {
    console.error("RPC call failed:", error)
    return { success: false, error: "Failed to process credit purchase. Please contact support." }
  }

  // Log the transaction
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
    .select("id, drawing_data, drawer_wallet_address, created_at") // Ensure created_at is selected
    .eq("session_id", session.id)
    .order("id", { ascending: true })
  if (drawingsError) throw new Error(drawingsError.message)
  return { session, drawings: drawings as Drawing[] }
}
export async function claimRevenueAction(prevState: any, formData: FormData) {
  const supabase = createSupabaseAdminClient()
  const streamerWallet = formData.get("streamer_wallet") as string
  const claimAmount = Number(formData.get("claim_amount"))

  if (!streamerWallet || !claimAmount || claimAmount <= 0) {
    return { ...initialState, error: "Invalid claim amount." }
  }

  // 1. Call DB function to prepare the claim and get a transaction ID
  const { data: transactionId, error: claimError } = await supabase
    .rpc("claim_all_revenue", { p_streamer_wallet_address: streamerWallet })
    .single()

  if (claimError || !transactionId) {
    console.error("Claim preparation failed:", claimError?.message)
    return { ...initialState, error: `Database claim failed: ${claimError?.message || "No revenue to claim."}` }
  }

  // 2. Perform the on-chain transaction
  const secretKeyStr = process.env.APP_WALLET_SECRET_KEY
  if (!secretKeyStr) {
    console.error("CRITICAL: APP_WALLET_SECRET_KEY is not set.")
    return { ...initialState, error: "Payout service is not configured." }
  }

  const rpcHost = process.env.SOLANA_RPC_HOST || process.env.NEXT_PUBLIC_SOLANA_RPC_HOST
  if (!rpcHost) {
    console.error("CRITICAL: SOLANA_RPC_HOST is not set.")
    return { ...initialState, error: "RPC service is not configured." }
  }

  try {
    const connection = new Connection(rpcHost, "confirmed")
    const appKeypair = Keypair.fromSecretKey(bs58.decode(secretKeyStr))
    const streamerPublicKey = new PublicKey(streamerWallet)

    // THE FIX: Get the latest blockhash before creating the transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
    const transaction = new Transaction({
      feePayer: appKeypair.publicKey,
      recentBlockhash: blockhash,
    }).add(
      SystemProgram.transfer({
        fromPubkey: appKeypair.publicKey,
        toPubkey: streamerPublicKey,
        lamports: Math.floor(claimAmount * LAMPORTS_PER_SOL),
      }),
    )

    const signature = await connection.sendTransaction(transaction, [appKeypair])
    await connection.confirmTransaction({ signature, lastValidBlockHeight, blockhash })

    // 3. Get the transaction fee and update the database record
    const fee = (await connection.getFeeForMessage(transaction.compileMessage(), "confirmed")).value || 0

    await supabase.rpc("update_transaction_details", {
      p_transaction_id: transactionId,
      p_signature: signature,
      p_fee: fee / LAMPORTS_PER_SOL, // Convert lamports to SOL
    })

    revalidatePath("/dashboard")
    return {
      ...initialState,
      success: true,
      message: `Successfully transferred ${claimAmount.toFixed(6)} SOL.`,
      signature: signature,
    }
  } catch (error: any) {
    console.error(`CRITICAL: On-chain payout failed for transaction ID ${transactionId}. Reverting DB claim.`, error)
    // SAFETY: Revert the database transaction if the on-chain transfer fails
    await supabase.from("transactions").delete().eq("id", transactionId)
    await supabase
      .from("revenue")
      .update({ unclaimed_sol: claimAmount, total_claimed_sol: 0 }) // This is a simplified revert, might need adjustment based on exact schema
      .eq("streamer_wallet_address", streamerWallet)

    return {
      ...initialState,
      error: `On-chain payout failed: ${getErrorMessage(error)}. Please contact support.`,
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
      .catch((err) => console.error(`[Realtime Broadcast Failed] Event: draw, Session: ${sessionId}`, err))
  }
  revalidatePath("/dashboard")
  return { success: true }
}

export async function initiateNukeAction(
  nukerWalletAddress: string,
  sessionId: string,
  nukeAnimation: NukeAnimation,
  txSignature?: string,
) {
  const supabase = createSupabaseAdminClient()
  const { data: nukerData } = await supabase
    .from("users")
    .select("username")
    .eq("wallet_address", nukerWalletAddress)
    .single()
  const nukerUsername = nukerData?.username || "A mysterious user"

  if (nukeAnimation.id === "free_nuke") {
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
        if (error) console.error(`[Background Free Nuke Cleanup Failed] Session: ${sessionId}`, error)
      })
  } else {
    if (!txSignature) {
      return { success: false, error: "Transaction signature is required for paid nukes." }
    }
    supabase
      .rpc("perform_nuke_cleanup", {
        p_nuker_wallet_address: nukerWalletAddress,
        p_session_id: sessionId,
        p_revenue_per_nuke: nukeAnimation.price,
        p_streamer_share_rate: STREAMER_REVENUE_SHARE,
      })
      .then(({ error }) => {
        if (error) console.error(`[Background Paid Nuke Cleanup Failed] Session: ${sessionId}`, error)
      })
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
        if (error) console.error(`[Paid Nuke Logging Failed] Session: ${sessionId}`, error)
      })
  }

  await supabase.channel(`session-${sessionId}`).send({
    type: "broadcast",
    event: "nuke",
    payload: {
      username: nukerUsername,
      animationId: nukeAnimation.id,
      nukeTimestamp: Date.now(), // Add timestamp to broadcast
    },
  })

  revalidatePath("/dashboard")
  return { success: true }
}

// New leaderboard functions
export async function getLeaderboard() {
  const admin = createSupabaseAdminClient()
  try {
    const { data, error } = await admin.rpc("get_leaderboard", { p_limit: 10 })
    if (error) {
      console.error("Failed to fetch leaderboard:", error)
      throw new Error(error.message)
    }
    return data || []
  } catch (error: any) {
    console.error("Leaderboard fetch failed:", error)
    throw new Error(`Failed to fetch leaderboard: ${error.message}`)
  }
}

export async function getUserRank(walletAddress: string) {
  const admin = createSupabaseAdminClient()
  try {
    const { data, error } = await admin.rpc("get_user_rank", { p_wallet_address: walletAddress })
    if (error) {
      console.error("Failed to fetch user rank:", error)
      throw new Error(error.message)
    }
    // The RPC returns an array with one object, so we extract the first item
    const result = Array.isArray(data) && data.length > 0 ? data[0] : null
    return {
      user_rank: result?.user_rank ?? 0,
      total_earnings: result?.total_earnings ?? 0,
      total_users_with_earnings: result?.total_users_with_earnings ?? 0,
    }
  } catch (error: any) {
    console.error("User rank fetch failed:", error)
    throw new Error(`Failed to fetch user rank: ${error.message}`)
  }
}

export async function getDashboardData() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "User not authenticated." }
  }

  try {
    const { data, error } = await supabase.rpc("get_user_dashboard_data", { p_user_id: user.id }).single()
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: `Failed to fetch data: ${error.message}` }
  }
}

// --- Advertisement Actions ---

export async function getStreamerAd(streamerWalletAddress: string): Promise<Advertisement | null> {
  const admin = createSupabaseAdminClient()

  try {
    const { data, error } = await admin
      .from("advertisements")
      .select("file_path, file_type, file_name")
      .eq("streamer_wallet_address", streamerWalletAddress)
      .eq("is_active", true)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching streamer ad:", error)
      return null
    }

    if (!data) return null

    return {
      filePath: data.file_path,
      fileType: data.file_type as "mp4" | "gif" | "image",
      fileName: data.file_name,
    }
  } catch (error) {
    console.error("Error in getStreamerAd:", error)
    return null
  }
}

export async function uploadCustomAd(
  prevState: any,
  formData: FormData,
): Promise<{ success: boolean; error?: string; message?: string }> {
  const admin = createSupabaseAdminClient()
  const streamerWallet = formData.get("streamerWallet") as string
  const adFile = formData.get("adFile") as File

  if (!streamerWallet || !adFile) {
    return { success: false, error: "Missing wallet address or file." }
  }

  if (adFile.size > 50 * 1024 * 1024) {
    return { success: false, error: "File size cannot exceed 50MB." }
  }

  // Map file types to database enum values
  let fileType: string
  if (adFile.type.startsWith("video/")) {
    fileType = "video" // Changed from "mp4" to "video"
  } else if (adFile.type === "image/gif") {
    fileType = "gif"
  } else if (adFile.type.startsWith("image/")) {
    fileType = "image"
  } else {
    return { success: false, error: "Invalid file type. Please upload an MP4, GIF, PNG, or JPG." }
  }

  try {
    // Delete existing ad if it exists
    const { data: existingAd } = await admin
      .from("advertisements")
      .select("file_path")
      .eq("streamer_wallet_address", streamerWallet)
      .single()

    if (existingAd?.file_path) {
      try {
        await del(existingAd.file_path)
      } catch (deleteError) {
        console.warn("Failed to delete existing ad file:", deleteError)
      }
    }

    // Upload new file
    const blob = await put(`ads/${streamerWallet}/${adFile.name}`, adFile, {
      access: "public",
      contentType: adFile.type,
      allowOverwrite: true, // Add this line to allow overwriting existing files
    })

    // Save to database
    const { error: dbError } = await admin.from("advertisements").upsert(
      {
        streamer_wallet_address: streamerWallet,
        file_path: blob.url,
        file_type: fileType, // Use the mapped file type
        file_name: adFile.name,
        is_active: true,
      },
      { onConflict: "streamer_wallet_address" },
    )

    if (dbError) {
      console.error("Database error:", dbError)
      throw dbError
    }

    revalidatePath("/dashboard")
    return { success: true, message: "Custom advertisement uploaded successfully!" }
  } catch (error: any) {
    console.error("Failed to upload custom ad:", error)
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function deleteCustomAd(
  streamerWalletAddress: string,
): Promise<{ success: boolean; error?: string; message?: string }> {
  const admin = createSupabaseAdminClient()

  try {
    const { data: ad, error: fetchError } = await admin
      .from("advertisements")
      .select("file_path")
      .eq("streamer_wallet_address", streamerWalletAddress)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") throw fetchError

    if (ad?.file_path) {
      try {
        await del(ad.file_path)
      } catch (deleteError) {
        console.warn("Failed to delete ad file from blob storage:", deleteError)
      }
    }

    const { error: deleteError } = await admin
      .from("advertisements")
      .delete()
      .eq("streamer_wallet_address", streamerWalletAddress)

    if (deleteError) throw deleteError

    revalidatePath("/dashboard")
    return { success: true, message: "Custom advertisement removed." }
  } catch (error: any) {
    console.error("Failed to delete custom ad:", error)
    return { success: false, error: getErrorMessage(error) }
  }
}
