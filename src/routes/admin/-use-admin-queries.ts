import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseQueryResult, QueryClient } from '@tanstack/react-query'
import { listPlayersFn } from '#/server-fns/admin-players'
import { listArmiesFn } from '#/server-fns/admin-armies'
import { listMatchesFn } from '#/server-fns/admin-matches'

export interface AdminQueries {
  playersQuery: UseQueryResult<Awaited<ReturnType<typeof listPlayersFn>>>
  armiesQuery: UseQueryResult<Awaited<ReturnType<typeof listArmiesFn>>>
  matchesQuery: UseQueryResult<Awaited<ReturnType<typeof listMatchesFn>>>
  queryClient: QueryClient
}

export function useAdminQueries(): AdminQueries {
  const queryClient = useQueryClient()

  const playersQuery = useQuery({
    queryKey: ['admin', 'players'],
    queryFn: () => listPlayersFn(),
  })

  const armiesQuery = useQuery({
    queryKey: ['admin', 'armies'],
    queryFn: () => listArmiesFn(),
  })

  const matchesQuery = useQuery({
    queryKey: ['admin', 'matches'],
    queryFn: () => listMatchesFn(),
  })

  return { playersQuery, armiesQuery, matchesQuery, queryClient }
}
