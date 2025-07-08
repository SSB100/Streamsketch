"use client"

import type React from "react"
import { useMemo, useRef } from "react"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { clusterApiUrl } from "@solana/web3.js"

// Use a standard import for the CSS file at the top level.
import "@solana/wallet-adapter-react-ui/styles.css"

export function AppWalletProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Mainnet
  const hasRpcWarningBeenLogged = useRef(false)

  const endpoint = useMemo(() => {
    const custom = (process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "").trim()

    if (custom && /^https?:\/\//i.test(custom)) {
      return custom
    }

    // Only log the warning once to avoid spamming the console.
    if (custom && !hasRpcWarningBeenLogged.current) {
      console.warn(
        "[WalletAdapter] CRITICAL: Ignoring invalid NEXT_PUBLIC_SOLANA_RPC_HOST (must start with http:// or https://). Falling back to Solana public RPC. This will cause performance issues and transaction failures.",
      )
      hasRpcWarningBeenLogged.current = true
    }

    return clusterApiUrl(network)
  }, [network])

  const wallets = useMemo(() => [], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={true}
        onError={(err) => {
          if (err.name !== "WalletNotConnectedError" && err.name !== "WalletConnectionError") {
            console.warn("[WalletAdapter]", err?.message ?? err)
          }
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
