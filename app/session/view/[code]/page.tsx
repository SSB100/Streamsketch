import { getSessionData, getStreamerAd } from "@/app/actions"
import SessionView from "@/components/session/session-view"
import type { Advertisement } from "@/lib/types"

export default async function SessionViewPage({ params }: { params: { code: string } }) {
  // Fetch session data first, as it's critical for the page
  const { session, drawings } = await getSessionData(params.code)

  if (!session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-deep-space text-white">
        Session not found.
      </div>
    )
  }

  // Fetch ad data in a try-catch to prevent page crash
  let customAd: Advertisement | null = null
  try {
    customAd = await getStreamerAd(session.owner_wallet_address)
  } catch (error) {
    console.error("Failed to fetch custom ad, continuing without it:", error)
    // The page will render without the custom ad if this fails.
  }

  return (
    <SessionView initialSession={session} initialDrawings={drawings} customAd={customAd} sessionCode={params.code} />
  )
}
