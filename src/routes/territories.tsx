// Campaign TOW — /territories route
// Placeholder page for territories.

import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useHydrated } from '../lib/useHydrated'

export const Route = createFileRoute('/territories')({
  component: TerritoriesView,
})

function TerritoriesView() {
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
        Territoires
      </h1>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
          fontStyle: 'italic',
        }}
      >
        En construction
      </p>
    </main>
  )
}
