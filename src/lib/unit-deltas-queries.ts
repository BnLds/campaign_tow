import { queryOptions } from '@tanstack/react-query'
import { fetchUnitDeltasFn } from '../server-fns/unit-queries'
import { STALE_TIME_UNIT_DELTAS } from './query-constants'

export const unitDeltasQueryOptions = (armyId: string, unitId: string) =>
  queryOptions({
    queryKey: ['unit-deltas', armyId, unitId],
    queryFn: () => fetchUnitDeltasFn({ data: { armyId, unitId } }),
    staleTime: STALE_TIME_UNIT_DELTAS,
  })
