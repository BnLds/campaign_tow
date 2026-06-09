import { queryOptions } from '@tanstack/react-query'
import { STALE_TIME_TERRITORY } from '@/lib/query-constants'
import { loadTerritoryDashboardFn } from '@/server-fns/territory-queries'
import type { TerritoryDashboardData } from '@/server-fns/territory-queries'
import type { ServerResult } from '@/lib/types'

export const territoryDashboardQueryOptions = (playerId: string) =>
  queryOptions<ServerResult<TerritoryDashboardData>>({
    queryKey: ['territory', playerId],
    queryFn: () => loadTerritoryDashboardFn(),
    staleTime: STALE_TIME_TERRITORY,
    enabled: !!playerId,
  })
