// Campaign TOW — server-actions.ts unit tests
// Dual-path contract: test-injection path vs dynamic import path

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { submitUnitXpAction, completeEvolutionsAction } from '../server-actions'
import type { ConsequenceEntry } from '../types'

const mockSubmitUnitXpFn = vi.fn()
const mockCompleteEvolutionsWithGainsFn = vi.fn()

vi.mock('../../../routes/match/$matchId/post-match', () => ({
  submitUnitXpFn: mockSubmitUnitXpFn,
  completeEvolutionsWithGainsFn: mockCompleteEvolutionsWithGainsFn,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const XP_RESULT = { success: true as const, data: { unitId: 'u1', newXp: 10 } }
const EVO_RESULT = { success: true as const, data: { matchId: 'm1' } }

const GAINS = [{ unitId: 'u1', descriptions: ['Charge +1'] }]
const CONSEQUENCES: ConsequenceEntry[] = [{ unitId: 'u1', type: 'miracule' }]
const CHAMPION_IDS = ['u2']

// ---------------------------------------------------------------------------
// submitUnitXpAction
// ---------------------------------------------------------------------------

describe('submitUnitXpAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- injection path ---

  it('calls injected onSubmitUnitXp with base args when no optional params', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue(XP_RESULT)

    const result = await submitUnitXpAction({
      unitId: 'u1',
      xpGained: 5,
      matchParticipantId: 'mp1',
      onSubmitUnitXp,
    })

    expect(onSubmitUnitXp).toHaveBeenCalledWith('u1', 5, 'mp1')
    expect(mockSubmitUnitXpFn).not.toHaveBeenCalled()
    expect(result).toEqual(XP_RESULT)
  })

  it('calls injected onSubmitUnitXp with bonusXp when bonusXp > 0', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue(XP_RESULT)

    await submitUnitXpAction({
      unitId: 'u1',
      xpGained: 5,
      matchParticipantId: 'mp1',
      bonusXp: 3,
      onSubmitUnitXp,
    })

    expect(onSubmitUnitXp).toHaveBeenCalledWith('u1', 5, 'mp1', undefined, 3)
  })

  it('calls injected onSubmitUnitXp with derouteXpLost when provided', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue(XP_RESULT)

    await submitUnitXpAction({
      unitId: 'u1',
      xpGained: 5,
      matchParticipantId: 'mp1',
      derouteXpLost: 2,
      onSubmitUnitXp,
    })

    expect(onSubmitUnitXp).toHaveBeenCalledWith('u1', 5, 'mp1', 2)
  })

  // --- dynamic import path ---

  it('calls submitUnitXpFn via dynamic import when no injection provided', async () => {
    mockSubmitUnitXpFn.mockResolvedValue(XP_RESULT)

    const result = await submitUnitXpAction({
      unitId: 'u1',
      xpGained: 5,
      matchParticipantId: 'mp1',
    })

    expect(mockSubmitUnitXpFn).toHaveBeenCalledWith({
      data: {
        matchParticipantId: 'mp1',
        unitId: 'u1',
        xpGained: 5,
        derouteXpLost: undefined,
        bonusXp: undefined,
      },
    })
    expect(result).toEqual(XP_RESULT)
  })

  it('passes bonusXp to submitUnitXpFn when bonusXp > 0', async () => {
    mockSubmitUnitXpFn.mockResolvedValue(XP_RESULT)

    await submitUnitXpAction({
      unitId: 'u1',
      xpGained: 5,
      matchParticipantId: 'mp1',
      bonusXp: 3,
    })

    expect(mockSubmitUnitXpFn).toHaveBeenCalledWith({
      data: {
        matchParticipantId: 'mp1',
        unitId: 'u1',
        xpGained: 5,
        derouteXpLost: undefined,
        bonusXp: 3,
      },
    })
  })

  it('coerces bonusXp = 0 to undefined in submitUnitXpFn call', async () => {
    mockSubmitUnitXpFn.mockResolvedValue(XP_RESULT)

    await submitUnitXpAction({
      unitId: 'u1',
      xpGained: 5,
      matchParticipantId: 'mp1',
      bonusXp: 0,
    })

    expect(mockSubmitUnitXpFn).toHaveBeenCalledWith({
      data: {
        matchParticipantId: 'mp1',
        unitId: 'u1',
        xpGained: 5,
        derouteXpLost: undefined,
        bonusXp: undefined,
      },
    })
  })
})

// ---------------------------------------------------------------------------
// completeEvolutionsAction
// ---------------------------------------------------------------------------

describe('completeEvolutionsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- injection path ---

  it('calls injected onCompleteEvolutions with all params', async () => {
    const onCompleteEvolutions = vi.fn().mockResolvedValue(EVO_RESULT)

    const result = await completeEvolutionsAction({
      matchId: 'm1',
      matchParticipantId: 'mp1',
      gains: GAINS,
      consequences: CONSEQUENCES,
      championKilledIds: CHAMPION_IDS,
      onCompleteEvolutions,
    })

    expect(onCompleteEvolutions).toHaveBeenCalledWith('m1', 'mp1', GAINS, CONSEQUENCES, CHAMPION_IDS)
    expect(mockCompleteEvolutionsWithGainsFn).not.toHaveBeenCalled()
    expect(result).toEqual(EVO_RESULT)
  })

  it('passes empty gains and undefined optional params when omitted', async () => {
    const onCompleteEvolutions = vi.fn().mockResolvedValue(EVO_RESULT)

    await completeEvolutionsAction({
      matchId: 'm1',
      matchParticipantId: 'mp1',
      gains: [],
      onCompleteEvolutions,
    })

    expect(onCompleteEvolutions).toHaveBeenCalledWith('m1', 'mp1', [], undefined, undefined)
  })

  // --- dynamic import path ---

  it('calls completeEvolutionsWithGainsFn via dynamic import when no injection provided', async () => {
    mockCompleteEvolutionsWithGainsFn.mockResolvedValue(EVO_RESULT)

    const result = await completeEvolutionsAction({
      matchId: 'm1',
      matchParticipantId: 'mp1',
      gains: GAINS,
      consequences: CONSEQUENCES,
      championKilledIds: CHAMPION_IDS,
    })

    expect(mockCompleteEvolutionsWithGainsFn).toHaveBeenCalledWith({
      data: {
        matchId: 'm1',
        matchParticipantId: 'mp1',
        gains: GAINS,
        consequences: CONSEQUENCES,
        championKilledIds: CHAMPION_IDS,
      },
    })
    expect(result).toEqual(EVO_RESULT)
  })
})
