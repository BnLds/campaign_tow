// Campaign TOW — /references route
// Placeholder page for campaign reference tables (epic 5).

import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useHydrated } from '../lib/useHydrated'

export const Route = createFileRoute('/references')({
  component: ReferencesView,
})

function ReferencesView() {
  const hydrated = useHydrated()

  useEffect(() => {
    if (hydrated) {
      document.documentElement.setAttribute('data-app-hydrated', 'true')
    }
  }, [hydrated])

  return (
    <main style={{ padding: '1rem', maxWidth: '720px', margin: '0 auto' }}>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '1.5rem',
          color: 'var(--color-text-primary)',
          marginBottom: '1rem',
        }}
      >
        References
      </h1>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
          fontStyle: 'italic',
        }}
      >
        Contenu a venir — tables de reference de campagne
      </p>
    </main>
  )
}
