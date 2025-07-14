"use server"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js"
import bs58 from "bs58"

const ADMIN_WITHDRAW_WALLET = process.env.ADMIN_WITHDRAW_WALLET || "2z6QBmtAhjGBBzrQZ58RvpQNSkFhBCw9AhzFURsfvspZ"

const initialState = {
  success: false,
  message: "",
  signature: "",
  error: "",
}

export async function verifyAdminPassword(password: string): Promise<{ success: boolean }> {
  const correctPassword = process.env.ADMIN_PASSWORD
  if (!correctPassword) {
    console.error("CRITICAL: ADMIN_PASSWORD environment variable is not set.")
    // Fail safely if the password isn't configured on the server.
    return { success: false }
  }
  const success = password === correctPassword
  return { success }
}

export async function getAdminDashboardData() {
  const admin = createSupabaseAdminClient()
  try {
    const { data, error } = await admin.rpc("get_admin_dashboard_stats").single()
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error("[Admin] Failed to get dashboard data:", error.message)
    return { success: false, error: `Failed to fetch data: ${error.message}` }
  }
}

export async function adminWithdrawAction(prevState: typeof initialState, formData: FormData) {
  const supabase = createSupabaseAdminClient()

  // 1. Call DB function to get withdrawal amount and create transaction record
  const { data: result, error: claimError } = await supabase.rpc("admin_withdraw_revenue").single()

  if (claimError) {
    return { ...initialState, success: false, error: `Database claim failed: ${claimError.message}` }
  }

  const { withdrawal_amount: claimedAmount, transaction_id: transactionId } = result

  if (!claimedAmount || claimedAmount <= 0) {
    return { ...initialState, success: false, error: "No platform earnings to withdraw." }
  }

  // 2. Perform the on-chain transaction
  const secretKeyStr = process.env.APP_WALLET_SECRET_KEY
  if (!secretKeyStr) {
    console.error("CRITICAL: APP_WALLET_SECRET_KEY is not set.")
    return { ...initialState, success: false, error: "Payout service is not configured. Please contact support." }
  }

  const adminWalletAddress = process.env.ADMIN_WITHDRAW_WALLET
  if (!adminWalletAddress) {
    console.error("CRITICAL: ADMIN_WITHDRAW_WALLET is not set.")
    return { ...initialState, success: false, error: "Admin wallet is not configured. Please contact support." }
  }

  const rpcHost = process.env.SOLANA_RPC_HOST || process.env.NEXT_PUBLIC_SOLANA_RPC_HOST
  if (!rpcHost) {
    console.error("CRITICAL: SOLANA_RPC_HOST is not set.")
    return { ...initialState, success: false, error: "RPC service is not configured. Please contact support." }
  }

  try {
    const connection = new Connection(rpcHost, "confirmed")
    const appKeypair = Keypair.fromSecretKey(bs58.decode(secretKeyStr))
    const adminPublicKey = new PublicKey(adminWalletAddress)

    // 1. Get the latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

    // 2. Create the transaction
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: appKeypair.publicKey,
    }).add(
      SystemProgram.transfer({
        fromPubkey: appKeypair.publicKey,
        toPubkey: adminPublicKey,
        lamports: Math.floor(Number(claimedAmount) * LAMPORTS_PER_SOL),
      }),
    )

    // 3. Sign and send the transaction
    const signature = await connection.sendTransaction(transaction, [appKeypair])

    // 4. Confirm the transaction
    await connection.confirmTransaction({
      signature,
      lastValidBlockHeight,
      blockhash,
    })

    // 5. Get the transaction fee and update the database record
    // Note: getFeeForMessage is deprecated. We can estimate or fetch post-confirmation.
    // For simplicity, we'll fetch the confirmed transaction to get the fee.
    const confirmedTx = await connection.getConfirmedTransaction(signature, "confirmed")
    const fee = confirmedTx?.meta?.fee || 0

    if (transactionId) {
      await supabase.rpc("update_transaction_details", {
        p_transaction_id: transactionId,
        p_signature: signature,
        p_fee: fee / LAMPORTS_PER_SOL, // Convert lamports to SOL
      })
    }

    revalidatePath("/admin")
    return {
      ...initialState,
      success: true,
      message: `Successfully claimed and transferred ${Number(claimedAmount).toFixed(6)} SOL.`,
      signature: signature,
    }
  } catch (error: any) {
    console.error(`CRITICAL: Admin on-chain payout failed after claiming ${claimedAmount} SOL from DB.`, error)
    // Attempt to revert the database state if on-chain fails
    if (transactionId) {
      await supabase.from("transactions").delete().eq("id", transactionId)
      console.log(`Reverted transaction record ${transactionId} due to on-chain failure.`)
    }
    return {
      ...initialState,
      success: false,
      error: `On-chain payout failed: ${error.message}. The database state has been reverted. Please try again.`,
    }
  }
}
