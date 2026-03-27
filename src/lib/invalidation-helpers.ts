import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'

/**
 * Invalidates all client-side caches that depend on army state
 * (initialXpCompletedAt, record, etc.). Call this after any mutation
 * that modifies the armies table so both __root__ and child routes
 * pick up the change.
 */
export async function invalidateArmyState(queryClient: QueryClient, router: AnyRouter) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['army-info'] }),
    // Route IDs from src/routes/__root.tsx and src/routes/index.tsx — update if routes are renamed
    router.invalidate({ filter: (d) => d.routeId === '__root__' || d.routeId === '/' }),
  ])
}
