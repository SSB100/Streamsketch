"use client"

import { type FC, type ReactNode, useMemo } from "react"
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { clusterApiUrl } from "@solana/web3.js"

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css"

// Stripe-related imports
import { loadStripe } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"

// IMPORTANT: Call loadStripe outside of a component’s render to avoid
// recreating the Stripe object on every render.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_your_test_key")

export const AppWalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  // By providing an empty array, the WalletProvider will automatically detect
  // any wallets that support the Wallet Standard.
  const wallets = useMemo(() => [], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider
        wallets={wallets}
        autoConnect
        onError={(error) => {
          // Silently handle common "user rejected" errors.
          if (error.name === "WalletConnectionError" || error.name === "WalletNotConnectedError") {
            // You can optionally log these for debugging, but they are not critical app failures.
            // console.warn(`[WalletAdapter] Non-critical error: ${error.name}`);
            return
          }
          // Log all other, more serious errors.
          console.error("[WalletAdapter] Critical error:", error)
        }}
      >
        <WalletModalProvider>
          <Elements stripe={stripePromise}>{children}</Elements>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}
