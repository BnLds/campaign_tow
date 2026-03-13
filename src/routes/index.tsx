import { createFileRoute, useRouteContext, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useEffect } from 'react'
import { useHydrated } from '../lib/useHydrated'
import { WelcomeModal } from '../components/welcome-modal'
import { markPlayerWelcomeSeen, updatePlayerDisplayName } from '../db/queries'
import { authMiddleware } from '../lib/middleware'
import type { ServerResult } from '../lib/types'
import { updateDisplayNameSchema } from '../lib/validators'

const markWelcomeSeenFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<void> => {
    await markPlayerWelcomeSeen(context.session.playerId)
  })

const updateDisplayNameFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(updateDisplayNameSchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ displayName: string }>> => {
    await updatePlayerDisplayName(context.session.playerId, data.displayName)
    return { success: true, data: { displayName: data.displayName } }
  })

export const Route = createFileRoute('/')({ component: CampaignView })

function CampaignView() {
  const router = useRouter()
  const context = useRouteContext({ from: '__root__' })
  const { session } = context
  const [modalOpen, setModalOpen] = useState(session?.hasSeenWelcome === false)
  const hydrated = useHydrated()

  useEffect(() => {
    if (hydrated) {
      document.documentElement.setAttribute('data-app-hydrated', 'true')
    }
  }, [hydrated])

  const handleDismiss = async () => {
    try {
      await markWelcomeSeenFn()
    } finally {
      setModalOpen(false)
      await router.invalidate()
    }
  }

  const handleUpdateDisplayName = async (name: string) => {
    const result = await updateDisplayNameFn({ data: { displayName: name } })
    if (!result.success) {
      throw new Error(result.error.message)
    }
  }

  return (
    <>
      <WelcomeModal
        open={modalOpen}
        displayName={session?.displayName ?? ''}
        onDismiss={handleDismiss}
        onUpdateDisplayName={handleUpdateDisplayName}
      />
      <main style={{ padding: '2rem' }}>
        <h1>Campaign TOW</h1>
        <p>Campaign view — story 1.3+</p>
      </main>
    </>
  )
}
