import { getSessionData, getStreamerAd } from "@/app/actions"

export default async function SessionViewPage({ params }: { params: { code: string } }) {
  const { session, drawings } = await getSessionData(params.code)

  if (!session) {
    return <div>Session not found</div>
  }

  const customAd = await getStreamerAd(session.owner_wallet_address)

  return (
    <div>
      {/* Rest of the page content */}
      <AdOverlay customAd={customAd} />
    </div>
  )
}
