import { createClient } from '@supabase/supabase-js'

function mask(val?: string) {
  if (!val) return '(missing)'
  if (val.length <= 6) return '****'
  return val.slice(0, 3) + '...' + val.slice(-3)
}

async function main() {
  console.log('=== StreamSketch Setup Verification (v53) ===')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseService = process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY

  const solanaRpc = process.env.SOLANA_RPC_HOST || process.env.NEXT_PUBLIC_SOLANA_RPC_HOST
  const appSecret = process.env.APP_WALLET_SECRET_KEY
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  console.log('Supabase URL:', supabaseUrl || '(missing)')
  console.log('Supabase anon key:', mask(supabaseAnon))
  console.log('Supabase service key:', mask(supabaseService))
  console.log('Solana RPC host:', solanaRpc || '(missing)')
  console.log('App wallet secret (bs58):', appSecret ? '(present)' : '(missing)')
  console.log('Stripe publishable key:', stripeKey ? '(present)' : '(missing or using fallback)')

  // Basic anon connectivity check (no secrets)
  if (!supabaseUrl || !supabaseAnon) {
    console.error('ERROR: Missing public Supabase env. Cannot continue anon connectivity check.')
    process.exit(1)
  }

  const anon = createClient(supabaseUrl, supabaseAnon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    // Ping: try a very lightweight RPC if available, else a metadata fetch
    const { data, error } = await anon
      .from('sessions')
      .select('id')
      .limit(1)

    if (error) {
      console.warn('Anon select sessions failed (may be expected with RLS):', error.message)
    } else {
      console.log('Anon select sessions OK (RLS may allow public read): rows=', data?.length ?? 0)
    }
  } catch (e: any) {
    console.error('Anon connectivity check failed:', e?.message ?? e)
  }

  // Optional admin connectivity check (requires service key)
  if (supabaseService) {
    const admin = createClient(supabaseUrl, supabaseService, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    try {
      const { data, error } = await admin
        .from('users')
        .select('wallet_address')
        .limit(1)
      if (error) {
        console.warn('Admin select users error:', error.message)
      } else {
        console.log('Admin connectivity OK: users rows=', data?.length ?? 0)
      }
    } catch (e: any) {
      console.error('Admin connectivity failed:', e?.message ?? e)
    }
  } else {
    console.warn('Skipping admin connectivity: service key not set.')
  }

  // Final summary
  const ok =
    !!supabaseUrl &&
    !!supabaseAnon &&
    !!solanaRpc &&
    !!appSecret

  console.log('=== Summary ===')
  console.log('- Base env present:', ok)
  if (!ok) {
    console.log('Missing required env. Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SOLANA_RPC_HOST or NEXT_PUBLIC_SOLANA_RPC_HOST, APP_WALLET_SECRET_KEY')
  }
}

main().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})
