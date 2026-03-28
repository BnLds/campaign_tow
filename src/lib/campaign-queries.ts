import { queryOptions } from '@tanstack/react-query'
import { loadCampaignTimelineFn } from '../server-fns/campaign-queries'
import { STALE_TIME_CAMPAIGN_TIMELINE, REFETCH_INTERVAL_CAMPAIGN_TIMELINE } from './query-constants'

export const campaignTimelineQueryOptions = (playerId: string) =>
  queryOptions({
    queryKey: ['campaign-timeline', playerId],
    queryFn: () => loadCampaignTimelineFn(),
    staleTime: STALE_TIME_CAMPAIGN_TIMELINE,
    refetchInterval: REFETCH_INTERVAL_CAMPAIGN_TIMELINE,
    refetchOnWindowFocus: true,
  })
