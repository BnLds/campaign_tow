import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildConsequencesArray,
  buildChampionKilledIds,
  buildTierUpQueue,
  buildBatchGainsPayload,
  buildFlaggedUnits,
} from '../helpers'

// ---------------------------------------------------------------------------
// Mocks — hoisted before imports by Vitest
// ---------------------------------------------------------------------------

vi.mock('../../../lib/tier', () => ({
  detectTierCrossings: vi.fn(),
}))

vi.mock('../phase-tierup', () => ({
  expandQueueEntry: vi.fn(),
}))

import { detectTierCrossings } from '../../../lib/tier'
import { expandQueueEntry } from '../phase-tierup'

const mockDetectTierCrossings = vi.mocked(detectTierCrossings)
const mockExpandQueueEntry = vi.mocked(expandQueueEntry)

// ---------------------------------------------------------------------------
// Shared factories
// ---------------------------------------------------------------------------

function makeWizardUnit(overrides: Partial<Parameters<typeof buildFlaggedUnits>[0][0]> = {}) {
  return {
    id: 'u1',
    name: 'Hallebardiers',
    type: 'Infanterie',
    xp: 0,
    ...overrides,
  }
}

function makeThresholdEntry(overrides: Partial<{
  xp: number
  tierLabel: string
  majorImprovements: Array<{ id: string; label: string; category: 'minor' | 'major' | 'honour' }>
  minorImprovements: Array<{ id: string; label: string; category: 'minor' | 'major' | 'honour' }>
  majorCount: number
  minorCount: number
}> = {}) {
  return {
    xp: 10,
    tierLabel: 'Aguerri',
    majorImprovements: [],
    minorImprovements: [{ id: 'u-t10-min-cc', label: '+1 CC', category: 'minor' as const }],
    majorCount: 0,
    minorCount: 1,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// buildConsequencesArray
// ---------------------------------------------------------------------------

describe('buildConsequencesArray', () => {
  it('returns empty array when pending map and initial consequences are empty', () => {
    const result = buildConsequencesArray(new Map(), [], 'Opponent')
    expect(result).toEqual([])
  })

  it('builds a ConsequenceEntry for an InjuryResult of type miracule', () => {
    const pending = new Map([['u1', { type: 'miracule' as const }]])
    const result = buildConsequencesArray(pending, [], 'Opponent')
    expect(result).toEqual([{ unitId: 'u1', type: 'miracule' }])
  })

  it('includes stat and delta for InjuryResult type permanent_injury', () => {
    const pending = new Map([
      ['u2', { type: 'permanent_injury' as const, stat: 'cc', delta: -1 as const }],
    ])
    const result = buildConsequencesArray(pending, [], 'Opponent')
    expect(result).toEqual([{ unitId: 'u2', type: 'permanent_injury', stat: 'cc', delta: -1 }])
  })

  it('includes opponentPlayerName for InjuryResult type haine', () => {
    const pending = new Map([['u3', { type: 'haine' as const }]])
    const result = buildConsequencesArray(pending, [], 'GrandAdversaire')
    expect(result).toEqual([{ unitId: 'u3', type: 'haine', opponentPlayerName: 'GrandAdversaire' }])
  })

  it('builds a ConsequenceEntry for a DestructionResult (includes bannerLost)', () => {
    const pending = new Map([
      ['u4', { type: 'moral_brise' as const, bannerLost: true }],
    ])
    const result = buildConsequencesArray(pending, [], 'Opponent')
    expect(result).toEqual([{ unitId: 'u4', type: 'moral_brise', bannerLost: true }])
  })

  it('includes opponentPlayerName for DestructionResult type rancune', () => {
    const pending = new Map([
      ['u5', { type: 'rancune' as const, bannerLost: false }],
    ])
    const result = buildConsequencesArray(pending, [], 'EnnemiJure')
    expect(result).toEqual([
      { unitId: 'u5', type: 'rancune', bannerLost: false, opponentPlayerName: 'EnnemiJure' },
    ])
  })

  it('includes xpLostAmount for DestructionResult type deroute_sanglante', () => {
    const pending = new Map([
      ['u6', { type: 'deroute_sanglante' as const, bannerLost: false, xpLostAmount: 15 }],
    ])
    const result = buildConsequencesArray(pending, [], 'Opponent')
    expect(result).toEqual([
      { unitId: 'u6', type: 'deroute_sanglante', bannerLost: false, xpLostAmount: 15 },
    ])
  })

  it('does not include xpLostAmount when it is null', () => {
    const pending = new Map([
      ['u7', { type: 'deroute_sanglante' as const, bannerLost: false, xpLostAmount: null as unknown as number }],
    ])
    const result = buildConsequencesArray(pending, [], 'Opponent')
    expect(result[0]).not.toHaveProperty('xpLostAmount')
  })

  it('appends initial consequences and strips _localId', () => {
    const initial = [
      { _localId: 42, unitId: 'u8', type: 'death' as const },
    ]
    const result = buildConsequencesArray(new Map(), initial, 'Opponent')
    expect(result).toEqual([{ unitId: 'u8', type: 'death' }])
    expect(result[0]).not.toHaveProperty('_localId')
  })

  it('concatenates pending and initial consequences in order', () => {
    const pending = new Map([['u9', { type: 'miracule' as const }]])
    const initial = [{ _localId: 1, unitId: 'u10', type: 'no_effect' as const }]
    const result = buildConsequencesArray(pending, initial, 'Opponent')
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ unitId: 'u9', type: 'miracule' })
    expect(result[1]).toMatchObject({ unitId: 'u10', type: 'no_effect' })
  })
})

// ---------------------------------------------------------------------------
// buildChampionKilledIds
// ---------------------------------------------------------------------------

describe('buildChampionKilledIds', () => {
  it('returns empty array for empty map', () => {
    expect(buildChampionKilledIds(new Map())).toEqual([])
  })

  it('returns only the IDs where the flag is true', () => {
    const flags = new Map([
      ['u1', true],
      ['u2', false],
      ['u3', true],
    ])
    const result = buildChampionKilledIds(flags)
    expect(result).toEqual(['u1', 'u3'])
  })

  it('returns empty array when all flags are false', () => {
    const flags = new Map([
      ['u1', false],
      ['u2', false],
    ])
    expect(buildChampionKilledIds(flags)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// buildTierUpQueue
// ---------------------------------------------------------------------------

describe('buildTierUpQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no crossings detected, expandQueueEntry returns identity
    mockDetectTierCrossings.mockReturnValue([])
    mockExpandQueueEntry.mockImplementation((entry) => [entry])
  })

  it('warns and skips units with no XP result', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const units = [makeWizardUnit({ id: 'u1', name: 'Hallebardiers' })]
    const result = buildTierUpQueue(units, new Map())
    expect(result).toEqual([])
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('u1')
    )
    warnSpy.mockRestore()
  })

  it('returns empty queue when detectTierCrossings returns no crossings', () => {
    const units = [makeWizardUnit({ id: 'u1' })]
    const xpResults = new Map([['u1', { oldXp: 0, newXp: 5 }]])
    mockDetectTierCrossings.mockReturnValue([])
    const result = buildTierUpQueue(units, xpResults)
    expect(result).toEqual([])
  })

  it('returns expanded queue entries for units with tier crossings', () => {
    const crossing = makeThresholdEntry({ tierLabel: 'Aguerri' })
    mockDetectTierCrossings.mockReturnValue([crossing])
    const units = [makeWizardUnit({ id: 'u1', name: 'Archers', type: 'Infanterie', hasMount: false, commandement: 7 })]
    const xpResults = new Map([['u1', { oldXp: 0, newXp: 12 }]])
    const result = buildTierUpQueue(units, xpResults)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      unitId: 'u1',
      unitName: 'Archers',
      unitType: 'Infanterie',
      hasMount: false,
      commandement: 7,
      tierLabel: 'Aguerri',
    })
    expect(mockExpandQueueEntry).toHaveBeenCalledOnce()
  })

  it('defaults hasMount to false and commandement to 0 when not provided', () => {
    const crossing = makeThresholdEntry()
    mockDetectTierCrossings.mockReturnValue([crossing])
    const units = [makeWizardUnit({ id: 'u1' })]
    const xpResults = new Map([['u1', { oldXp: 0, newXp: 12 }]])
    const result = buildTierUpQueue(units, xpResults)
    expect(result[0]).toMatchObject({ hasMount: false, commandement: 0 })
  })

  it('filters out honour improvements already present in existingGains', () => {
    const honourCrossing = makeThresholdEntry({
      xp: 3,
      tierLabel: 'Honneur de bataille',
      majorImprovements: [],
      minorImprovements: [
        { id: '1', label: '+1 CC', category: 'honour' as const },
        { id: '2', label: 'Champion gratuit', category: 'honour' as const },
      ],
      majorCount: 0,
      minorCount: 1,
    })
    mockDetectTierCrossings.mockReturnValue([honourCrossing])
    const units = [
      makeWizardUnit({
        id: 'u1',
        type: 'Infanterie',
        existingGains: [{ description: '+1 CC', type: 'honour' }],
      }),
    ]
    const xpResults = new Map([['u1', { oldXp: 0, newXp: 5 }]])
    const result = buildTierUpQueue(units, xpResults)
    // expandQueueEntry should be called with the filtered improvement list
    expect(mockExpandQueueEntry).toHaveBeenCalledOnce()
    const calledWith = mockExpandQueueEntry.mock.calls[0][0]
    expect(calledWith.minorImprovements).toEqual([
      { id: '2', label: 'Champion gratuit', category: 'honour' },
    ])
    expect(result).toHaveLength(1)
  })

  it('skips the honour crossing entirely when all minorImprovements are filtered out', () => {
    const honourCrossing = makeThresholdEntry({
      xp: 3,
      tierLabel: 'Honneur de bataille',
      majorImprovements: [],
      minorImprovements: [
        { id: '1', label: '+1 CC', category: 'honour' as const },
      ],
      majorCount: 0,
      minorCount: 1,
    })
    mockDetectTierCrossings.mockReturnValue([honourCrossing])
    const units = [
      makeWizardUnit({
        id: 'u1',
        type: 'Infanterie',
        existingGains: [{ description: '+1 CC', type: 'honour' }],
      }),
    ]
    const xpResults = new Map([['u1', { oldXp: 0, newXp: 5 }]])
    const result = buildTierUpQueue(units, xpResults)
    expect(result).toEqual([])
    expect(mockExpandQueueEntry).not.toHaveBeenCalled()
  })

  it('does not filter improvements for non-honour crossings even if existingGains match', () => {
    const normalCrossing = makeThresholdEntry({
      tierLabel: 'Aguerri',
      minorImprovements: [{ id: '1', label: '+1 CC', category: 'minor' as const }],
    })
    mockDetectTierCrossings.mockReturnValue([normalCrossing])
    const units = [
      makeWizardUnit({
        id: 'u1',
        existingGains: [{ description: '+1 CC', type: 'minor' }],
      }),
    ]
    const xpResults = new Map([['u1', { oldXp: 0, newXp: 12 }]])
    buildTierUpQueue(units, xpResults)
    const calledWith = mockExpandQueueEntry.mock.calls[0][0]
    expect(calledWith.minorImprovements).toEqual([{ id: '1', label: '+1 CC', category: 'minor' }])
  })
})

// ---------------------------------------------------------------------------
// buildTierUpQueue — honour re-selection after loss
// ---------------------------------------------------------------------------

describe('buildTierUpQueue — honour re-selection after loss', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDetectTierCrossings.mockReturnValue([])
    mockExpandQueueEntry.mockImplementation((entry) => [entry])
  })

  it('test 1: champion killed +4 XP, no threshold crossing → 1 retrigger entry', () => {
    const units = [makeWizardUnit({ id: 'u1' })]
    const xpResults = new Map([['u1', { oldXp: 15, newXp: 19 }]])
    const lostGainTypes = new Map([['u1', new Set(['honour_champion'])]])
    const result = buildTierUpQueue(units, xpResults, lostGainTypes)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      unitId: 'u1',
      tierLabel: "Récupération d'honneur",
      honourKind: 'recovery',
      xp: 0,
      minorCount: 1,
    })
    const labels = result[0].minorImprovements.map((m) => m.label)
    expect(labels).toContain('Champion gratuit')
    expect(labels).toContain('Non applicable')
    // IDs inside minorImprovements include unitId and slot index
    const ids = result[0].minorImprovements.map((m) => m.id)
    expect(ids.some((id) => /u-retrigger-u1/.test(id))).toBe(true)
  })

  it('test 2: champion killed +2 XP (floor(2/3)=0) → 0 retrigger entries', () => {
    const units = [makeWizardUnit({ id: 'u1' })]
    const xpResults = new Map([['u1', { oldXp: 15, newXp: 17 }]])
    const lostGainTypes = new Map([['u1', new Set(['honour_champion'])]])
    const result = buildTierUpQueue(units, xpResults, lostGainTypes)
    expect(result).toHaveLength(0)
  })

  it('test 3: both honours lost +7 XP → 2 retrigger entries each with champ+ban+NA', () => {
    const units = [makeWizardUnit({ id: 'u1' })]
    const xpResults = new Map([['u1', { oldXp: 20, newXp: 27 }]])
    const lostGainTypes = new Map([['u1', new Set(['honour_champion', 'honour_banner'])]])
    const result = buildTierUpQueue(units, xpResults, lostGainTypes)
    expect(result).toHaveLength(2)
    for (const entry of result) {
      expect(entry).toMatchObject({ tierLabel: "Récupération d'honneur", honourKind: 'recovery', xp: 0, minorCount: 1 })
      const labels = entry.minorImprovements.map((m) => m.label)
      expect(labels).toContain('Champion gratuit')
      expect(labels).toContain('Bannière gratuite')
      expect(labels).toContain('Non applicable')
    }
    // Each retrigger entry has distinct improvement IDs (contain unitId + slot index)
    const allImprovementIds = result.flatMap((e) => e.minorImprovements.map((m) => m.id))
    const champIds = allImprovementIds.filter((id) => id.includes('-champ-'))
    expect(new Set(champIds).size).toBe(2)
  })

  it('test 4: both honours lost +4 XP → 1 retrigger entry (min(2, floor(4/3)=1))', () => {
    const units = [makeWizardUnit({ id: 'u1' })]
    const xpResults = new Map([['u1', { oldXp: 20, newXp: 24 }]])
    const lostGainTypes = new Map([['u1', new Set(['honour_champion', 'honour_banner'])]])
    const result = buildTierUpQueue(units, xpResults, lostGainTypes)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ tierLabel: "Récupération d'honneur", honourKind: 'recovery', xp: 0, minorCount: 1 })
  })

  it('test 5: champion killed + crosses 9 XP threshold → 2 total entries (Effect A keeps champ visible)', () => {
    const honourCrossing = makeThresholdEntry({
      xp: 9,
      tierLabel: 'Honneur de bataille',
      majorImprovements: [],
      minorImprovements: [
        { id: 'u-hon2-champ', label: 'Champion gratuit', category: 'honour' as const },
        { id: 'u-hon2-ban', label: 'Bannière gratuite', category: 'honour' as const },
        { id: 'u-hon2-na', label: 'Non applicable', category: 'honour' as const },
      ],
      majorCount: 0,
      minorCount: 1,
    })
    mockDetectTierCrossings.mockReturnValue([honourCrossing])
    const units = [
      makeWizardUnit({
        id: 'u1',
        existingGains: [{ description: 'Champion gratuit', type: 'honour_champion' }],
      }),
    ]
    const xpResults = new Map([['u1', { oldXp: 7, newXp: 10 }]])
    const lostGainTypes = new Map([['u1', new Set(['honour_champion'])]])
    const result = buildTierUpQueue(units, xpResults, lostGainTypes)
    expect(result).toHaveLength(2)
    // Normal crossing entry (from expandQueueEntry) — identified by xp threshold value
    const normalEntry = result.find((e) => e.xp === 9)
    expect(normalEntry).toBeDefined()
    expect(normalEntry).toMatchObject({ tierLabel: 'Honneur de bataille', honourKind: 'new' })
    // Retrigger entry — xp:0 and improvements contain a retrigger id pattern
    const retriggerEntry = result.find(
      (e) => e.xp === 0 && e.minorImprovements.some((m) => m.id.includes('u-retrigger'))
    )
    expect(retriggerEntry).toBeDefined()
    expect(retriggerEntry).toMatchObject({ tierLabel: "Récupération d'honneur", honourKind: 'recovery', minorCount: 1 })
    // expandQueueEntry called once only (retrigger entries bypass it)
    expect(mockExpandQueueEntry).toHaveBeenCalledOnce()
  })

  it('test 6: champion killed + crosses 3 XP threshold → 2 total entries', () => {
    const honourCrossing = makeThresholdEntry({
      xp: 3,
      tierLabel: 'Honneur de bataille',
      majorImprovements: [],
      minorImprovements: [
        { id: 'u-hon2-champ', label: 'Champion gratuit', category: 'honour' as const },
        { id: 'u-hon2-ban', label: 'Bannière gratuite', category: 'honour' as const },
        { id: 'u-hon2-na', label: 'Non applicable', category: 'honour' as const },
      ],
      majorCount: 0,
      minorCount: 1,
    })
    mockDetectTierCrossings.mockReturnValue([honourCrossing])
    const units = [makeWizardUnit({ id: 'u1' })]
    const xpResults = new Map([['u1', { oldXp: 1, newXp: 5 }]])
    const lostGainTypes = new Map([['u1', new Set(['honour_champion'])]])
    const result = buildTierUpQueue(units, xpResults, lostGainTypes)
    expect(result).toHaveLength(2)
    const normalEntry = result.find((e) => e.xp === 3)
    expect(normalEntry).toBeDefined()
    const retriggerEntry = result.find(
      (e) => e.xp === 0 && e.minorImprovements.some((m) => m.id.includes('u-retrigger'))
    )
    expect(retriggerEntry).toBeDefined()
    expect(retriggerEntry).toMatchObject({ tierLabel: "Récupération d'honneur", honourKind: 'recovery', minorCount: 1 })
    // expandQueueEntry called once only (retrigger entries bypass it)
    expect(mockExpandQueueEntry).toHaveBeenCalledOnce()
  })

  it('test 7: no loss (undefined lostGainTypes) → 0 entries (regression guard)', () => {
    const units = [makeWizardUnit({ id: 'u1' })]
    const xpResults = new Map([['u1', { oldXp: 15, newXp: 18 }]])
    const result = buildTierUpQueue(units, xpResults)
    expect(result).toHaveLength(0)
  })

  it('test 8: Personnages type is skipped → 0 retrigger entries', () => {
    const units = [makeWizardUnit({ id: 'u1', type: 'Personnages' })]
    const xpResults = new Map([['u1', { oldXp: 10, newXp: 15 }]])
    const lostGainTypes = new Map([['u1', new Set(['honour_champion'])]])
    const result = buildTierUpQueue(units, xpResults, lostGainTypes)
    expect(result).toHaveLength(0)
  })

  it('test 9 (bug scenario): unit 3 XP + bannière, destroyed, gains +6 XP → crosses 9 XP, bannière lost → 2 entries, banner excluded from normal crossing', () => {
    // Unit has existing bannière, crosses 9 XP threshold, bannière was lost this match.
    // Expected: normal crossing does NOT include 'Bannière gratuite' (reserved for retrigger),
    // retrigger entry DOES include 'Bannière gratuite' + 'Non applicable'.
    const honourCrossing = makeThresholdEntry({
      xp: 9,
      tierLabel: 'Honneur de bataille',
      majorImprovements: [],
      minorImprovements: [
        { id: 'u-hon-champ', label: 'Champion gratuit', category: 'honour' as const },
        { id: 'u-hon-ban', label: 'Bannière gratuite', category: 'honour' as const },
        { id: 'u-hon-mus', label: 'Musicien gratuit', category: 'honour' as const },
        { id: 'u-hon-na', label: 'Non applicable', category: 'honour' as const },
      ],
      majorCount: 0,
      minorCount: 1,
    })
    mockDetectTierCrossings.mockReturnValue([honourCrossing])
    // Unit had bannière as existing gain; it was lost (lostGainTypes)
    const units = [
      makeWizardUnit({
        id: 'u1',
        type: 'Infanterie',
        existingGains: [{ description: 'Bannière gratuite', type: 'honour_banner' }],
      }),
    ]
    const xpResults = new Map([['u1', { oldXp: 3, newXp: 9 }]])
    const lostGainTypes = new Map([['u1', new Set(['honour_banner'])]])
    const result = buildTierUpQueue(units, xpResults, lostGainTypes)

    expect(result).toHaveLength(2)

    // Normal crossing: honourKind: 'new', must NOT contain 'Bannière gratuite'
    const normalEntry = result.find((e) => e.xp === 9)
    expect(normalEntry).toBeDefined()
    expect(normalEntry).toMatchObject({ honourKind: 'new', tierLabel: 'Honneur de bataille' })
    const normalLabels = normalEntry!.minorImprovements.map((m) => m.label)
    expect(normalLabels).not.toContain('Bannière gratuite')

    // Retrigger entry: honourKind: 'recovery', MUST contain 'Bannière gratuite' + 'Non applicable'
    const retriggerEntry = result.find(
      (e) => e.xp === 0 && e.minorImprovements.some((m) => m.id.includes('u-retrigger'))
    )
    expect(retriggerEntry).toBeDefined()
    expect(retriggerEntry).toMatchObject({ honourKind: 'recovery', tierLabel: "Récupération d'honneur" })
    const retriggerLabels = retriggerEntry!.minorImprovements.map((m) => m.label)
    expect(retriggerLabels).toContain('Bannière gratuite')
    expect(retriggerLabels).toContain('Non applicable')
  })
})

// ---------------------------------------------------------------------------
// buildBatchGainsPayload
// ---------------------------------------------------------------------------

describe('buildBatchGainsPayload', () => {
  it('returns empty array for empty map', () => {
    expect(buildBatchGainsPayload(new Map())).toEqual([])
  })

  it('flattens multiple groups for a single unit', () => {
    const pendingGains = new Map([
      [
        'u1',
        [
          { descriptions: ['+1 CC'], thresholdXp: 10 },
          { descriptions: ['+1 Force'], thresholdXp: 25 },
        ],
      ],
    ])
    const result = buildBatchGainsPayload(pendingGains)
    expect(result).toEqual([
      { unitId: 'u1', descriptions: ['+1 CC'], thresholdXp: 10 },
      { unitId: 'u1', descriptions: ['+1 Force'], thresholdXp: 25 },
    ])
  })

  it('flattens groups across multiple units', () => {
    const pendingGains = new Map([
      ['u1', [{ descriptions: ['+1 CC'], thresholdXp: 10 }]],
      ['u2', [{ descriptions: ['+1 Initiative'], thresholdXp: null }]],
    ])
    const result = buildBatchGainsPayload(pendingGains)
    expect(result).toHaveLength(2)
    expect(result).toContainEqual({ unitId: 'u1', descriptions: ['+1 CC'], thresholdXp: 10 })
    expect(result).toContainEqual({ unitId: 'u2', descriptions: ['+1 Initiative'], thresholdXp: null })
  })

  it('preserves null thresholdXp as-is', () => {
    const pendingGains = new Map([
      ['u1', [{ descriptions: ['+1 CC'], thresholdXp: null }]],
    ])
    const result = buildBatchGainsPayload(pendingGains)
    expect(result[0].thresholdXp).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// buildFlaggedUnits
// ---------------------------------------------------------------------------

describe('buildFlaggedUnits', () => {
  it('returns empty array when no flags are set', () => {
    const units = [makeWizardUnit({ id: 'u1' })]
    const flags = new Map([['u1', false]])
    expect(buildFlaggedUnits(units, flags)).toEqual([])
  })

  it('returns empty array when flags map is empty', () => {
    const units = [makeWizardUnit({ id: 'u1' })]
    expect(buildFlaggedUnits(units, new Map())).toEqual([])
  })

  it('places Personnages-type units before other unit types', () => {
    const units = [
      makeWizardUnit({ id: 'u1', name: 'Archer', type: 'Infanterie' }),
      makeWizardUnit({ id: 'u2', name: 'Héros', type: 'Personnages' }),
      makeWizardUnit({ id: 'u3', name: 'Cavalier', type: 'Cavalerie' }),
    ]
    const flags = new Map([
      ['u1', true],
      ['u2', true],
      ['u3', true],
    ])
    const result = buildFlaggedUnits(units, flags)
    expect(result[0].id).toBe('u2')
    expect(result[1].id).toBe('u1')
    expect(result[2].id).toBe('u3')
  })

  it('returns FlaggedUnit with correct shape', () => {
    const units = [
      makeWizardUnit({
        id: 'u1',
        name: 'Hallebardiers',
        type: 'Infanterie',
        existingGains: [{ description: '+1 CC', type: 'minor' }],
      }),
    ]
    const flags = new Map([['u1', true]])
    const result = buildFlaggedUnits(units, flags)
    expect(result).toEqual([
      {
        id: 'u1',
        name: 'Hallebardiers',
        type: 'Infanterie',
        existingGains: [{ description: '+1 CC', type: 'minor' }],
      },
    ])
  })

  it('defaults existingGains to empty array when not provided', () => {
    const units = [makeWizardUnit({ id: 'u1' })]
    const flags = new Map([['u1', true]])
    const result = buildFlaggedUnits(units, flags)
    expect(result[0].existingGains).toEqual([])
  })

  it('only includes units whose flag is true', () => {
    const units = [
      makeWizardUnit({ id: 'u1' }),
      makeWizardUnit({ id: 'u2', name: 'Archers' }),
    ]
    const flags = new Map([
      ['u1', false],
      ['u2', true],
    ])
    const result = buildFlaggedUnits(units, flags)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('u2')
  })
})
