import { getSessionData, getStreamerAd } from "@/app/actions"
import SessionView from "@/components/session/session-view"
import { FullscreenWrapper } from "@/components/session/fullscreen-wrapper"
import type { Advertisement } from "@/lib/types"

export default async function SessionViewPage({ params }: { params: { code: string } }) {
  const { session, drawings } = await getSessionData(params.code)

  if (!session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">Session not found.</div>
    )
  }

  let customAd: Advertisement | null = null
  try {
    customAd = await getStreamerAd(session.owner_wallet_address)
  } catch (error) {
    console.error("Failed to fetch custom ad, continuing without it:", error)
  }

  return (
    <FullscreenWrapper sessionCode={params.code}>
      <SessionView initialSession={session} initialDrawings={drawings} customAd={customAd} sessionCode={params.code} />
    </FullscreenWrapper>
  )
}
