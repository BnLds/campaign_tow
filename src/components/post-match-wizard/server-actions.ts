// Campaign TOW — PostMatchWizard server action wrappers
// Encapsulates the dynamic import pattern + test-injection dual path

import type { ConsequenceEntry, PostMatchWizardProps, ServerResult } from './types'

// ---------------------------------------------------------------------------
// Private — dynamic import (never exported)
// ---------------------------------------------------------------------------

const getPostMatchServerFns = () => import('../../routes/match/$matchId/post-match')

// ---------------------------------------------------------------------------
// submitUnitXpAction
// ---------------------------------------------------------------------------

export type SubmitUnitXpParams = {
  unitId: string
  xpGained: number
  matchParticipantId: string
  derouteXpLost?: number
  bonusXp?: number
  /** Test injection — bypasses server call when provided */
  onSubmitUnitXp?: PostMatchWizardProps['onSubmitUnitXp']
}

export async function submitUnitXpAction(
  params: SubmitUnitXpParams,
): Promise<ServerResult<{ unitId: string; newXp: number }>> {
  const { unitId, xpGained, matchParticipantId, derouteXpLost, bonusXp = 0, onSubmitUnitXp } = params

  if (onSubmitUnitXp) {
    if (derouteXpLost !== undefined) {
      return onSubmitUnitXp(unitId, xpGained, matchParticipantId, derouteXpLost)
    }
    if (bonusXp > 0) {
      return onSubmitUnitXp(unitId, xpGained, matchParticipantId, undefined, bonusXp)
    }
    return onSubmitUnitXp(unitId, xpGained, matchParticipantId)
  }

  const { submitUnitXpFn } = await getPostMatchServerFns()
  return submitUnitXpFn({
    data: {
      matchParticipantId,
      unitId,
      xpGained,
      derouteXpLost,
      bonusXp: bonusXp > 0 ? bonusXp : undefined,
    },
  })
}

// ---------------------------------------------------------------------------
// completeEvolutionsAction
// ---------------------------------------------------------------------------

export type CompleteEvolutionsParams = {
  matchId: string
  matchParticipantId: string
  gains: Array<{ unitId: string; descriptions: string[]; thresholdXp?: number | null }>
  consequences?: ConsequenceEntry[]
  championKilledIds?: string[]
  /** Test injection — bypasses server call when provided */
  onCompleteEvolutions?: PostMatchWizardProps['onCompleteEvolutions']
}

export async function completeEvolutionsAction(
  params: CompleteEvolutionsParams,
): Promise<ServerResult<{ matchId: string }>> {
  const { matchId, matchParticipantId, gains, consequences, championKilledIds, onCompleteEvolutions } = params

  if (onCompleteEvolutions) {
    return onCompleteEvolutions(matchId, matchParticipantId, gains, consequences, championKilledIds)
  }

  const { completeEvolutionsWithGainsFn } = await getPostMatchServerFns()
  return completeEvolutionsWithGainsFn({
    data: { matchId, matchParticipantId, gains, consequences, championKilledIds },
  })
}
