import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: CampaignView })

function CampaignView() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Campaign TOW</h1>
      <p>Campaign view — story 1.2+</p>
    </main>
  )
}
