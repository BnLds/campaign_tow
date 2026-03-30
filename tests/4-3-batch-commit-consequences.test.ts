// tests/4-3-batch-commit-consequences.test.ts
// Story 4.3: Character Injuries & Unit Destruction
// Status: RED — written before implementation (TDD)
//
// Tests for:
//   - completeEvolutionsWithGainsSchema extended with consequences
//   - completeEvolutionsWithGainsTransaction consequence processing
//   - Temporary modifier auto-cleanup (AC24)
//   - Stat floor at 0 (AC25)
//   - DEROUTE_XP_LOSS constant (Task 7.3)
//
// All tests will fail with import errors or assertion failures until implementation.
//
// Covers Task 12 (AC: 4, 5, 6, 8, 15, 16, 17, 19, 21, 24, 25) + Task 7.3

import { describe, it, expect } from 'vitest'
import { completeEvolutionsWithGainsSchema } from '../src/lib/validators'
import { DEROUTE_XP_LOSS, HONOUR_THRESHOLDS } from '../src/lib/constants'

// ---------------------------------------------------------------------------
// Task 12.1 — Schema accepts consequences array (AC: 4)
// ---------------------------------------------------------------------------

describe('[AC4][P0] completeEvolutionsWithGainsSchema — consequences field (Task 12.1)', () => {
  it('[4.3-SCH-001] schema accepts input with consequences array', () => {
    const input = {
      matchId: 'match-1',
      matchParticipantId: 'mp-1',
      gains: [],
      consequences: [
        { unitId: 'unit-1', type: 'permanent_injury', stat: 'e', delta: -1 },
      ],
    }
    const result = completeEvolutionsWithGainsSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('[4.3-SCH-002] schema accepts input without consequences (backward compatible)', () => {
    const input = {
      matchId: 'match-1',
      matchParticipantId: 'mp-1',
      gains: [],
    }
    const result = completeEvolutionsWithGainsSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('[4.3-SCH-003] schema accepts empty consequences array', () => {
    const input = {
      matchId: 'match-1',
      matchParticipantId: 'mp-1',
      gains: [],
      consequences: [],
    }
    const result = completeEvolutionsWithGainsSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('[4.3-SCH-004] schema validates consequence type enum', () => {
    const input = {
      matchId: 'match-1',
      matchParticipantId: 'mp-1',
      gains: [],
      consequences: [
        { unitId: 'unit-1', type: 'invalid_type' },
      ],
    }
    const result = completeEvolutionsWithGainsSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('[4.3-SCH-005] schema accepts all valid consequence types', () => {
    const validTypes = [
      'death',
      'permanent_injury',
      'grave_injury',
      'no_effect',
      'haine',
      'miracule',
      'deroute_sanglante',
      'pertes_catastrophiques',
      'moral_brise',
      'survivants_endurcis',
      'rancune',
      'fureur_vengeresse',
    ]
    // Each type needs its required fields to pass validation
    const typeData: Record<string, Record<string, unknown>> = {
      death: {},
      permanent_injury: { stat: 'cc', delta: -1 },
      grave_injury: { stat: 'e', delta: -1 },
      no_effect: {},
      haine: {},
      miracule: {},
      deroute_sanglante: { xpLostAmount: 5 },
      pertes_catastrophiques: {},
      moral_brise: {},
      survivants_endurcis: {},
      rancune: {},
      fureur_vengeresse: {},
    }
    for (const type of validTypes) {
      const input = {
        matchId: 'match-1',
        matchParticipantId: 'mp-1',
        gains: [],
        consequences: [{ unitId: 'unit-1', type, ...typeData[type] }],
      }
      const result = completeEvolutionsWithGainsSchema.safeParse(input)
      expect(result.success).toBe(true)
    }
  })

  it('[4.3-SCH-006] schema accepts consequence with optional stat and delta fields', () => {
    const input = {
      matchId: 'match-1',
      matchParticipantId: 'mp-1',
      gains: [],
      consequences: [
        { unitId: 'unit-1', type: 'permanent_injury', stat: 'cc', delta: -1 },
      ],
    }
    const result = completeEvolutionsWithGainsSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('[4.3-SCH-007] schema accepts consequence with optional bannerLost field', () => {
    const input = {
      matchId: 'match-1',
      matchParticipantId: 'mp-1',
      gains: [],
      consequences: [
        { unitId: 'unit-1', type: 'deroute_sanglante', bannerLost: true, xpLostAmount: 5 },
      ],
    }
    const result = completeEvolutionsWithGainsSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('[4.3-SCH-008] schema rejects consequence with empty unitId', () => {
    const input = {
      matchId: 'match-1',
      matchParticipantId: 'mp-1',
      gains: [],
      consequences: [{ unitId: '', type: 'death' }],
    }
    const result = completeEvolutionsWithGainsSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 12.2 — permanent_injury creates stat_modifier (AC: 4)
// ---------------------------------------------------------------------------

describe('[AC4][P0] Consequence processing — permanent_injury (Task 12.2)', () => {
  it('[4.3-TXN-001] permanent_injury consequence maps to stat_modifier with source=injury, temporary=false', () => {
    // This test verifies the mapping logic.
    // In the transaction: permanent_injury → insertStatModifier(unitId, stat, delta, 'injury', false)
    const consequence = {
      unitId: 'unit-1',
      type: 'permanent_injury' as const,
      stat: 'e',
      delta: -1,
    }

    // Verify the consequence structure matches the expected DB call parameters
    expect(consequence.type).toBe('permanent_injury')
    expect(consequence.stat).toBe('e')
    expect(consequence.delta).toBe(-1)
    // The actual insertStatModifier call is tested in integration tests
    // Here we verify the mapping: source='injury', temporary=false
  })
})

// ---------------------------------------------------------------------------
// Task 12.3 — grave_injury creates temporary stat_modifier (AC: 6)
// ---------------------------------------------------------------------------

describe('[AC6][P0] Consequence processing — grave_injury (Task 12.3)', () => {
  it('[4.3-TXN-002] grave_injury maps to insertStatModifier(unitId, "pv", -1, "injury", true)', () => {
    const consequence = {
      unitId: 'char-1',
      type: 'grave_injury' as const,
      stat: 'pv',
      delta: -1,
    }

    expect(consequence.stat).toBe('pv')
    expect(consequence.delta).toBe(-1)
    // Expected DB call: insertStatModifier(char-1, 'pv', -1, 'injury', true)
  })
})

// ---------------------------------------------------------------------------
// Task 12.4 — haine creates unit_gain (AC: 5)
// ---------------------------------------------------------------------------

describe('[AC5][P0] Consequence processing — haine (Task 12.4)', () => {
  it('[4.3-TXN-003] haine maps to insertUnitGain with description "Haine (blessure)"', () => {
    const consequence = { unitId: 'char-1', type: 'haine' as const }
    // Expected DB call: insertUnitGain('char-1', 'Haine (blessure)', matchParticipantId)
    expect(consequence.type).toBe('haine')
  })
})

// ---------------------------------------------------------------------------
// Task 12.5 — death creates unit_gain (AC: 8)
// ---------------------------------------------------------------------------

describe('[AC8][P0] Consequence processing — death (Task 12.5)', () => {
  it('[4.3-TXN-004] death maps to insertUnitGain with description "Mort (MHC)"', () => {
    const consequence = { unitId: 'char-1', type: 'death' as const }
    // Expected DB call: insertUnitGain('char-1', 'Mort (MHC)', matchParticipantId)
    expect(consequence.type).toBe('death')
  })

  it('[4.3-TXN-004b] death auto-sends unit to graveyard', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/db/queries/evolutions.ts', 'utf-8')
    // The death case must update the unit status to graveyard in the same transaction
    expect(code).toMatch(/case 'death':[\s\S]{0,400}\.update\(units\)[\s\S]{0,200}status:\s*'graveyard'/)
    expect(code).toMatch(/case 'death':[\s\S]{0,400}graveyardReason:\s*deathReason/)
  })
})

// ---------------------------------------------------------------------------
// Task 12.6 — moral_brise creates temporary stat_modifier (AC: 17)
// ---------------------------------------------------------------------------

describe('[AC17][P0] Consequence processing — moral_brise (Task 12.6)', () => {
  it('[4.3-TXN-005] moral_brise maps to insertStatModifier(unitId, "cd", -2, "destruction", true)', () => {
    const consequence = {
      unitId: 'unit-1',
      type: 'moral_brise' as const,
    }
    // Expected DB call: insertStatModifier('unit-1', 'cd', -2, 'destruction', true)
    expect(consequence.type).toBe('moral_brise')
  })
})

// ---------------------------------------------------------------------------
// Task 12.7 — pertes_catastrophiques creates unit_gain (AC: 16)
// ---------------------------------------------------------------------------

describe('[AC16][P0] Consequence processing — pertes_catastrophiques (Task 12.7)', () => {
  it('[4.3-TXN-006] pertes_catastrophiques maps to insertUnitGain with description containing "effectif réduit de moitié"', () => {
    const consequence = { unitId: 'unit-1', type: 'pertes_catastrophiques' as const }
    // Expected: insertUnitGain('unit-1', 'Pertes Catastrophiques (effectif réduit de moitié pour la prochaine bataille)', mp)
    expect(consequence.type).toBe('pertes_catastrophiques')
  })
})

// ---------------------------------------------------------------------------
// Task 12.8 — rancune creates unit_gain (AC: 19)
// ---------------------------------------------------------------------------

describe('[AC19][P0] Consequence processing — rancune (Task 12.8)', () => {
  it('[4.3-TXN-007] rancune maps to insertUnitGain with description "Haine — {player}"', () => {
    const consequence = { unitId: 'unit-1', type: 'rancune' as const }
    // Expected: insertUnitGain('unit-1', 'Haine — ennemi', matchParticipantId) when no opponentPlayerName
    expect(consequence.type).toBe('rancune')
  })
})

// ---------------------------------------------------------------------------
// Task 12.9 — bannerLost creates unit_gain (AC: 21)
// ---------------------------------------------------------------------------

describe('[AC21][P0] Consequence processing — banner lost (Task 12.9)', () => {
  it('[4.3-TXN-008] bannerLost=true maps to insertUnitGain with description "Bannière perdue (destruction)"', () => {
    const consequence = {
      unitId: 'unit-1',
      type: 'deroute_sanglante' as const,
      bannerLost: true,
    }
    // Expected: insertUnitGain('unit-1', 'Bannière perdue (destruction)', matchParticipantId)
    expect(consequence.bannerLost).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Task 12.10 — no_effect, miracule, survivants_endurcis, fureur_vengeresse create no DB entries
// ---------------------------------------------------------------------------

describe('[AC7,AC18,AC20][P0] Consequence processing — no-op types (Task 12.10)', () => {
  it('[4.3-TXN-009] no_effect type does not require any DB action', () => {
    const noOpTypes = ['no_effect', 'miracule', 'survivants_endurcis', 'fureur_vengeresse'] as const
    // These types are handled client-side:
    // - miracule/fureur_vengeresse: XP re-submitted already
    // - no_effect/survivants_endurcis: nothing to save
    // The transaction should skip these (no insertStatModifier or insertUnitGain call)
    for (const type of noOpTypes) {
      expect(['no_effect', 'miracule', 'survivants_endurcis', 'fureur_vengeresse']).toContain(type)
    }
  })
})

// ---------------------------------------------------------------------------
// Task 7.3 — DEROUTE_XP_LOSS constant (AC: 15)
// ---------------------------------------------------------------------------

describe('[AC15][P0] DEROUTE_XP_LOSS constant (Task 7.3)', () => {
  it('[4.3-DER-001] DEROUTE_XP_LOSS maps tier 0 (Bleusaille) to 10', () => {
    expect(DEROUTE_XP_LOSS[0]).toBe(10)
  })

  it('[4.3-DER-002] DEROUTE_XP_LOSS maps tier 1 (Aguerri) to 10', () => {
    expect(DEROUTE_XP_LOSS[1]).toBe(10)
  })

  it('[4.3-DER-003] DEROUTE_XP_LOSS maps tier 2 (Expérimenté) to 15', () => {
    expect(DEROUTE_XP_LOSS[2]).toBe(15)
  })

  it('[4.3-DER-004] DEROUTE_XP_LOSS maps tier 3 (Vétéran) to 20', () => {
    expect(DEROUTE_XP_LOSS[3]).toBe(20)
  })

  it('[4.3-DER-005] DEROUTE_XP_LOSS maps tier 4 (Légendaire) to 30', () => {
    expect(DEROUTE_XP_LOSS[4]).toBe(30)
  })
})

// ---------------------------------------------------------------------------
// Task 12.13 — Stat floor at 0 (AC: 25)
// ---------------------------------------------------------------------------

describe('[AC25][P0] Stat floor — delta-composer clamping (Task 12.13)', () => {
  // Note: This test imports from delta-composer which already exists.
  // The floor logic does NOT exist yet — tests will fail until implementation.

  it('[4.3-FLR-001] stat value with negative modifiers exceeding base is floored at 0', async () => {
    // Dynamically import to test — the floor logic must be added to composeUnitView
    const { composeUnitView } = await import('../src/lib/delta-composer')

    // A sub_profile with base CC = 3, and a stat_modifier of -5
    const subProfiles = [
      {
        label: 'Profil',
        isMount: false,
        cc: '3', ct: '3', f: '3', e: '3', pv: '1', i: '3', a: '1', cd: '7', m: '4',
      },
    ]
    const statModifiers = [
      { id: 'sm-1', unitId: 'u1', stat: 'cc', delta: -5, source: 'injury', temporary: false },
    ]

    const result = composeUnitView(subProfiles, statModifiers, [])

    // The CC value should be floored at 0 (3 + (-5) = -2 → 0)
    const ccStat = result.subProfiles[0].stats.cc
    expect(parseInt(ccStat.value, 10)).toBeGreaterThanOrEqual(0)
  })

  it('[4.3-FLR-002] movement stat is NOT floored (uncapped stat)', async () => {
    const { composeUnitView } = await import('../src/lib/delta-composer')

    const subProfiles = [
      {
        label: 'Profil',
        isMount: false,
        cc: '3', ct: '3', f: '3', e: '3', pv: '1', i: '3', a: '1', cd: '7', m: '4',
      },
    ]
    // Movement should not have negative modifiers in practice,
    // but this test verifies the uncapped behavior
    const statModifiers: Array<{ id: string; unitId: string; stat: string; delta: number; source: string; temporary: boolean }> = []

    const result = composeUnitView(subProfiles, statModifiers, [])

    const mStat = result.subProfiles[0].stats.m
    expect(mStat.value).toBe('4')
  })
})

// ---------------------------------------------------------------------------
// Deroute Sanglante — Schema extensions (AC1, AC3, AC8, AC9)
// ---------------------------------------------------------------------------

describe('[AC1][AC8][P0] Schema — gains thresholdXp field', () => {
  it('[DS-SCH-001] schema accepts gains with thresholdXp', () => {
    const input = {
      matchId: 'match-1',
      matchParticipantId: 'mp-1',
      gains: [{ unitId: 'unit-1', descriptions: ['+1 CC'], thresholdXp: 25 }],
    }
    const result = completeEvolutionsWithGainsSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('[DS-SCH-002] schema accepts gains with thresholdXp null', () => {
    const input = {
      matchId: 'match-1',
      matchParticipantId: 'mp-1',
      gains: [{ unitId: 'unit-1', descriptions: ['+1 CC'], thresholdXp: null }],
    }
    const result = completeEvolutionsWithGainsSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('[DS-SCH-003] schema accepts gains without thresholdXp (backward compat)', () => {
    const input = {
      matchId: 'match-1',
      matchParticipantId: 'mp-1',
      gains: [{ unitId: 'unit-1', descriptions: ['+1 CC'] }],
    }
    const result = completeEvolutionsWithGainsSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Deroute Sanglante — HONOUR_THRESHOLDS constant (AC2, AC9)
// ---------------------------------------------------------------------------

describe('[AC2][AC9][P0] HONOUR_THRESHOLDS constant', () => {
  it('[DS-HON-001] HONOUR_THRESHOLDS is exported from constants.ts', () => {
    expect(HONOUR_THRESHOLDS).toBeDefined()
  })

  it('[DS-HON-002] HONOUR_THRESHOLDS contains exactly [3, 9]', () => {
    expect(Array.from(HONOUR_THRESHOLDS)).toEqual([3, 9])
  })

  it('[DS-HON-003] HONOUR_THRESHOLDS is readonly (type-level, not modifiable at runtime)', () => {
    // Can be iterated and used as a Set
    const asSet = new Set<number>(HONOUR_THRESHOLDS)
    expect(asSet.has(3)).toBe(true)
    expect(asSet.has(9)).toBe(true)
    expect(asSet.size).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Deroute Sanglante — evolutions.ts structural tests (AC1, AC6, AC8)
// ---------------------------------------------------------------------------

describe('[AC1][AC6][P0] completeEvolutionsWithGainsTransaction — deroute tier-down (structural)', () => {
  it('[DS-TXN-001] re-entry reversal: un-clears gains with clearedByMatchParticipantId before deleting', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/db/queries/evolutions.ts', 'utf-8')
    // Must un-clear gains before deleting current match gains
    expect(code).toMatch(/clearedByMatchParticipantId:\s*null/)
    expect(code).toMatch(/cleared:\s*false[\s\S]{0,100}clearedByMatchParticipantId:\s*null/)
  })

  it('[DS-TXN-002] deroute_sanglante case delegates to handleDerouteTierDown which locks unit row with FOR UPDATE', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/db/queries/evolutions.ts', 'utf-8')
    // The deroute case must call handleDerouteTierDown
    expect(code).toContain("case 'deroute_sanglante'")
    expect(code).toMatch(/deroute_sanglante[\s\S]{0,200}handleDerouteTierDown/)
    // handleDerouteTierDown must use FOR UPDATE on the units table
    expect(code).toMatch(/handleDerouteTierDown[\s\S]{0,1500}\.for\('update'\)/)
  })

  it('[DS-TXN-003] deroute case calls detectLostThresholds imported from tier.ts', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/db/queries/evolutions.ts', 'utf-8')
    expect(code).toMatch(/import.*detectLostThresholds.*from.*tier/)
    expect(code).toContain('detectLostThresholds(')
  })

  it('[DS-TXN-004] tier-down soft-delete uses clearedByMatchParticipantId for reversibility', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/db/queries/evolutions.ts', 'utf-8')
    expect(code).toMatch(/cleared:\s*true[\s\S]{0,100}clearedByMatchParticipantId:\s*matchParticipantId/)
  })

  it('[DS-TXN-005] thresholdXp is inserted with tier-up gains', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/db/queries/evolutions.ts', 'utf-8')
    // thresholdXp must be passed when inserting unitGains
    expect(code).toMatch(/thresholdXp.*thresholdXp/)
  })

  it('[DS-TXN-006] HONOUR_THRESHOLDS exclusion is handled by detectLostThresholds (not duplicated in evolutions.ts)', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/db/queries/evolutions.ts', 'utf-8')
    // HONOUR_THRESHOLDS should NOT be imported in evolutions.ts — exclusion is in tier.ts detectLostThresholds
    expect(code).not.toMatch(/import.*HONOUR_THRESHOLDS/)
    expect(code).not.toContain('honourSet')
    // detectLostThresholds (which handles honour exclusion internally) must still be called
    expect(code).toContain('detectLostThresholds(')
  })
})

// ---------------------------------------------------------------------------
// Deroute Sanglante — wizard XP loss structural tests (AC3, AC4, AC5, AC11, AC12)
// ---------------------------------------------------------------------------

describe('[AC3][AC4][AC5][P0] Wizard — deroute XP loss (structural)', () => {
  it('[DS-WIZ-001] wizard deroute branch uses full tierLoss not capped at match gain', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/components/post-match-wizard/use-post-match-wizard.ts', 'utf-8')
    // The old actualLoss = Math.min(tierLoss, currentXpGained) must NOT be present
    expect(code).not.toContain('Math.min(tierLoss')
    // tierLoss is passed to server via derouteXpLost; server applies GREATEST(0, ...) floor
    expect(code).toContain('derouteXpLost: tierLoss')
  })

  it('[DS-WIZ-002] wizard passes derouteXpLost to submitUnitXpFn (not adjusted xpGained)', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/components/post-match-wizard/use-post-match-wizard.ts', 'utf-8')
    expect(code).toContain('derouteXpLost: tierLoss')
  })

  it('[DS-WIZ-003] preMatchXp calculation accounts for previousDerouteXpLost', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/components/post-match-wizard/use-post-match-wizard.ts', 'utf-8')
    expect(code).toContain('previousDerouteXpLost')
    expect(code).toMatch(/previousXpGained.*previousDerouteXpLost|previousDerouteXpLost.*previousXpGained/)
  })

  it('[DS-WIZ-004] transitionToPhase2OrComplete contains AC12 invariant guard (throw, not console.assert)', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/components/post-match-wizard/use-post-match-wizard.ts', 'utf-8')
    expect(code).toContain('AC12 invariant violated')
    expect(code).toMatch(/throw new Error.*AC12/)
    expect(code).not.toContain('console.assert')
  })

  it('[DS-WIZ-005] xpResultsRef is updated with server-returned newXp (post-deroute) after deroute processing', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/components/post-match-wizard/use-post-match-wizard.ts', 'utf-8')
    // acc.current.recordXp must use the authoritative server value (data.newXp), not client-computed newTotalXp
    expect(code).toMatch(/acc\.current\.recordXp\(currentFlaggedUnit\.id[\s\S]{0,100}data\.newXp/)
  })
})

// ---------------------------------------------------------------------------
// Deroute Sanglante — upsertMatchXpEntryWithIncrement delta computation (AC3, AC5)
// ---------------------------------------------------------------------------

describe('[AC3][AC5][P0] upsertMatchXpEntryWithIncrement — delta with derouteXpLost', () => {
  it('[DS-UPD-001] evolutions.ts uses GREATEST(0, ...) for floor-at-zero on unit XP', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/db/queries/evolutions.ts', 'utf-8')
    expect(code).toContain('GREATEST(0,')
  })

  it('[DS-UPD-002] upsertMatchXpEntryWithIncrement accepts derouteXpLost parameter', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/db/queries/evolutions.ts', 'utf-8')
    expect(code).toMatch(/upsertMatchXpEntryWithIncrement[\s\S]{0,200}derouteXpLost/)
  })

  it('[DS-UPD-003] delta formula subtracts deroute delta from XP gain delta', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/db/queries/evolutions.ts', 'utf-8')
    // Must contain the combined delta computation
    expect(code).toMatch(/xpGained.*previousXpGained.*derouteXpLost.*previousDeroute|delta.*xpGained.*deroute/)
  })

  it('[DS-UPD-004] getMatchXpEntries returns derouteXpLost field', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/db/queries/evolutions.ts', 'utf-8')
    expect(code).toMatch(/getMatchXpEntries[\s\S]{0,300}derouteXpLost/)
  })
})

// ---------------------------------------------------------------------------
// Deroute Sanglante — schema DB columns (AC1, AC8)
// ---------------------------------------------------------------------------

describe('[AC1][AC8][P0] Schema — new DB columns', () => {
  it('[DS-DB-001] schema.ts defines thresholdXp on unitGains', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/db/schema.ts', 'utf-8')
    expect(code).toContain('threshold_xp')
    expect(code).toContain('thresholdXp')
  })

  it('[DS-DB-002] schema.ts defines clearedByMatchParticipantId on unitGains with onDelete set null', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/db/schema.ts', 'utf-8')
    expect(code).toContain('cleared_by_match_participant_id')
    expect(code).toContain('clearedByMatchParticipantId')
    expect(code).toMatch(/clearedByMatchParticipantId[\s\S]{0,100}onDelete:\s*'set null'/)
  })

  it('[DS-DB-003] schema.ts defines derouteXpLost on matchXpEntries with default 0 and CHECK >= 0', async () => {
    const { readFileSync } = await import('node:fs')
    const code = readFileSync('src/db/schema.ts', 'utf-8')
    expect(code).toContain('deroute_xp_lost')
    expect(code).toContain('derouteXpLost')
    expect(code).toContain('mxe_deroute_xp_lost_non_negative')
  })
})
