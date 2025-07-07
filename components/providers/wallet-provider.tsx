"use client"

import type React from "react"
import { useMemo } from "react"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { clusterApiUrl } from "@solana/web3.js"

// Use a standard import for the CSS file at the top level.
import "@solana/wallet-adapter-react-ui/styles.css"

export function AppWalletProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Devnet

  // Always use the canonical Devnet RPC -– wallet-standard recognises this host.
  const endpoint = useMemo(() => clusterApiUrl(network) /* e.g. https://api.devnet.solana.com */, [network])

  // Optimize connection settings
  const connectionConfig = useMemo(
    () => ({
      commitment: "confirmed" as const,
      confirmTransactionInitialTimeout: 60000, // 60 seconds
      disableRetryOnRateLimit: false,
      httpHeaders: {
        "Content-Type": "application/json",
      },
    }),
    [],
  )

  const wallets = useMemo(() => [], [])

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
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
