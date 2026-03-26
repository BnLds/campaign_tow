import { useRouteContext } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useHydrated } from '#/lib/useHydrated'
import { useAdminQueries } from './use-admin-queries'
import { AdminPlayersSection } from './admin-players-section'
import { AdminImportSection } from './admin-import-section'
import { AdminAssignmentSection } from './admin-assignment-section'
import { AdminMatchSection } from './admin-match-section'
import { AdminAddUnitSection } from './admin-add-unit-section'
import { AdminCorrectionSection } from './admin-correction-section'

export default function AdminPage() {
  const context = useRouteContext({ from: '__root__' })
  const { session } = context
  const queries = useAdminQueries()
  const hydrated = useHydrated()

  useEffect(() => {
    if (hydrated) {
      document.documentElement.setAttribute('data-app-hydrated', 'true')
    }
  }, [hydrated])

  return (
    <main style={{ padding: '1.5rem', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand)', marginBottom: '1.5rem' }}>
        Administration
      </h1>

      <AdminPlayersSection queries={queries} session={session} />
      <AdminImportSection queries={queries} />
      <AdminAssignmentSection queries={queries} />
      <AdminMatchSection queries={queries} />
      <AdminAddUnitSection queries={queries} />
      <AdminCorrectionSection queries={queries} />
    </main>
  )
}
