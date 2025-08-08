# StreamSketch System Audit (v53)

This document summarizes the current state of the application and database integration after reverting to v53.

Last reviewed: 2025-08-08

App framework and structure
- Next.js App Router with shadcn/ui and Tailwind preconfigured
- Server Actions used for DB write paths and blockchain ops (app/actions.ts)
- Supabase integration:
  - Admin (service_role) client: lib/supabase/admin.ts
  - Server client (SSR cookies): lib/supabase/server.ts
  - Browser client (anon): lib/supabase/client.ts
- Solana integration via @solana/web3.js within server actions
- Wallet provider: components/providers/wallet-provider.tsx
  - Uses WalletAdapterNetwork.Devnet
  - Auto-detect wallets (empty wallets array), autoConnect enabled
  - Phantom is not explicitly added in v53 (earlier change was reverted)
- Stripe:
  - Elements loaded with NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY or a fallback test key
- Real-time:
  - hooks/use-realtime-channel.ts present (not shown here), and Supabase channel broadcasts in actions

Key features and current behavior
- View page fullscreen overlay: components/session/fullscreen-wrapper.tsx
  - Displays only the session short_code when in fullscreen (URL text removed)
- Canvas scaling on view page: components/whiteboard/dynamic-canvas.tsx
  - Resizes via ResizeObserver and scales base 1280x720 coordinates
- Draw page uses the stable components/whiteboard/canvas.tsx (unchanged)
- Session view orchestration: components/session/session-view.tsx
- Advertisement overlay: components/advertisements/ad-overlay.tsx
  - Time slots: minutes 0, 15, 30, 45
  - Default slot (always default): :15
  - If no custom ad exists: default ad shows at all slots
  - Default ad is an image at /ads/default-ad-image.png and displays for 15 seconds unless skipped
- Dashboard pages and managers:
  - Revenue/claim flows implemented in app/actions.ts
  - Ad manager present (components/dashboard/ad-manager.tsx)
  - Session and stats modules present

Environment variables used
- Supabase:
  - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (client)
  - SUPABASE_SUPABASE_SERVICE_ROLE_KEY (server/admin)
- Solana:
  - SOLANA_RPC_HOST or NEXT_PUBLIC_SOLANA_RPC_HOST (RPC endpoint)
  - APP_WALLET_SECRET_KEY (bs58 secret key for payout)
  - APP_WALLET_ADDRESS (used for purchase verification, via lib/constants)
- Stripe:
  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (fallback to test string if missing)
- Other admin:
  - ADMIN_PASSWORD and ADMIN_WITHDRAW_WALLET vars exist in workspace but are not referenced in v53 code paths shown here

Database schema (expected essentials)
- Tables (non-exhaustive): users, revenue, sessions, drawings, transactions, advertisements
- Free credit related: session_free_line_credits, session_free_nuke_credits
- Gifting related: gifting tables introduced in 23/24 and later session-based updates
- RPC/functions referenced by code:
  - add_line_credits
  - record_drawing
  - claim_all_revenue
  - update_transaction_details
  - perform_nuke_cleanup
  - perform_free_nuke_cleanup
  - decrement_session_free_nuke_credit
  - get_session_free_credits
  - get_user_free_credit_sessions
  - get_total_free_credits
  - get_leaderboard
  - get_user_rank
  - get_gifting_limits
  - get_user_dashboard_data
  - gift_credits_to_session

Solana blockchain flows (server-side)
- Credit purchase verification:
  - Verifies signature via RPC host (parses transfer, checks source/destination/lamports)
  - Proceeds with awarding credits even if verification fails for RPC issues but logs a warning
  - Uses add_line_credits RPC to allocate credits
- Revenue claim:
  - claim_all_revenue RPC prepares a DB transaction id
  - Sends on-chain transfer from APP_WALLET_SECRET_KEY to streamer wallet
  - Updates transaction fee via update_transaction_details
  - Reverts DB changes if on-chain transfer fails
- Nukes:
  - Free nuke decrements session free credit and later cleanup via perform_free_nuke_cleanup
  - Paid nuke logs a transaction and runs perform_nuke_cleanup in the background

Known differences vs. earlier iteration (pre-revert)
- Mobile wallet optimization (explicit Phantom adapter and mobile-specific connector) was reverted with v53.
  - Current state uses wallet auto-detection only; mobile deep-link optimizations are NOT present in v53.
- RevenueManager Solscan mainnet toast and related changes may not be present if those were post-v51 changes (dashboard integration remains, but confirm your RevenueManager component if needed)

Health checks and recommendations
- Ensure SOLANA_RPC_HOST is set (server-side env) or NEXT_PUBLIC_SOLANA_RPC_HOST (client-config fallback)
- Ensure APP_WALLET_SECRET_KEY is a valid bs58 string for the app wallet keypair used in payouts
- Stripe publishable key can be added to avoid fallback test key:
  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- If you want reliable mobile Phantom connections:
  - Re-introduce explicit PhantomWalletAdapter and optional deep-link support with minimal surface-area change (can be proposed separately)
- Supabase RLS: Several scripts indicate RLS and realtime permissions are in place (52/53/80). Verify policies align with channel broadcasts if realtime is critical during sessions.

Operational scripts included with this audit
- scripts/audit-supabase.sql: read-only checks for expected tables and functions
- scripts/verify-setup.ts: node diagnostic for env presence and basic Supabase connectivity (no secrets logged)

How to use diagnostics
- Run the SQL checks against your Supabase database (in SQL editor or psql)
- Run the Node diagnostic locally with your environment configured:
  - node ./scripts/verify-setup.ts
  - Or integrate into a CI job to fail on missing env or connectivity issues
