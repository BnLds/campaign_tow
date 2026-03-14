// tests/2-3-delta-composer.test.ts
// Story 2.3: Unit Card Display with Campaign Deltas
// Status: RED — written before implementation (TDD)
//
// Tests for the pure `composeUnitView` function.
// Source file does NOT exist yet: src/lib/delta-composer.ts
// All tests will fail with import errors until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { composeUnitView } from '../src/lib/delta-composer'
import type { StatModifier, UnitGain } from '../src/lib/delta-composer'

// ---------------------------------------------------------------------------
// Helpers — minimal test fixtures
// ---------------------------------------------------------------------------

function makeSubProfile(label: string, stats: Record<string, string>) {
  return {
    id: 'sp-1',
    unitId: 'unit-1',
    sortOrder: 0,
    label,
    m: stats.m ?? null,
    cc: stats.cc ?? null,
    ct: stats.ct ?? null,
    f: stats.f ?? null,
    e: stats.e ?? null,
    pv: stats.pv ?? null,
    i: stats.i ?? null,
    a: stats.a ?? null,
    cd: stats.cd ?? null,
  }
}

function makeModifier(
  overrides: Partial<StatModifier> & { stat: string; delta: number }
): StatModifier {
  return {
    id: 'mod-1',
    unitId: 'unit-1',
    source: 'Campagne',
    temporary: false,
    ...overrides,
  }
}

function makeGain(overrides: Partial<UnitGain> & { description: string }): UnitGain {
  return {
    id: 'gain-1',
    unitId: 'unit-1',
    active: true,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Test 1 — No deltas: all stats unmodified
// ---------------------------------------------------------------------------

describe('[AC1] composeUnitView — no deltas (base stats only)', () => {
  it('[2.3-UNIT-001] all stats have modified=false and delta=null when no modifiers exist', () => {
    const subProfile = makeSubProfile('Archers', {
      m: '4',
      cc: '3',
      ct: '4',
      f: '3',
      e: '3',
      pv: '1',
      i: '3',
      a: '1',
      cd: '7',
    })
    const result = composeUnitView([subProfile], [], [])

    expect(result.subProfiles).toHaveLength(1)
    const stats = result.subProfiles[0].stats
    for (const key of ['m', 'cc', 'ct', 'f', 'e', 'pv', 'i', 'a', 'cd']) {
      expect(stats[key].modified, `stat ${key} should not be modified`).toBe(false)
      expect(stats[key].delta, `stat ${key} delta should be null`).toBeNull()
    }
  })
})

// ---------------------------------------------------------------------------
// Test 2 — Numeric bonus: stat value updated, modified=true
// ---------------------------------------------------------------------------

describe('[AC2] composeUnitView — numeric stat with positive delta', () => {
  it('[2.3-UNIT-002] m="4" + delta:+1 → value="5", delta=1, modified=true', () => {
    const subProfile = makeSubProfile('Lanciers', {
      m: '4',
      cc: '3',
      ct: '3',
      f: '3',
      e: '3',
      pv: '1',
      i: '3',
      a: '1',
      cd: '7',
    })
    const modifier = makeModifier({ stat: 'm', delta: 1 })
    const result = composeUnitView([subProfile], [modifier], [])

    const mStat = result.subProfiles[0].stats['m']
    expect(mStat.value).toBe('5')
    expect(mStat.delta).toBe(1)
    expect(mStat.modified).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Test 3 — Numeric penalty: negative delta
// ---------------------------------------------------------------------------

describe('[AC2] composeUnitView — numeric stat with negative delta', () => {
  it('[2.3-UNIT-003] cc="3" + delta:-1 → value="2", delta=-1, modified=true', () => {
    const subProfile = makeSubProfile('Gobelins', {
      m: '4',
      cc: '3',
      ct: '3',
      f: '3',
      e: '3',
      pv: '1',
      i: '3',
      a: '1',
      cd: '7',
    })
    const modifier = makeModifier({ stat: 'cc', delta: -1 })
    const result = composeUnitView([subProfile], [modifier], [])

    const ccStat = result.subProfiles[0].stats['cc']
    expect(ccStat.value).toBe('2')
    expect(ccStat.delta).toBe(-1)
    expect(ccStat.modified).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Test 4 — Non-numeric base stat (e.g. "3+") — value unchanged, delta present
// ---------------------------------------------------------------------------

describe('[AC2] composeUnitView — non-numeric base stat', () => {
  it('[2.3-UNIT-004] ct="3+" + delta:+1 → value="3+" unchanged, delta=1, modified=true', () => {
    const subProfile = makeSubProfile('Tireurs', {
      m: '4',
      cc: '3',
      ct: '3+',
      f: '3',
      e: '3',
      pv: '1',
      i: '3',
      a: '1',
      cd: '7',
    })
    const modifier = makeModifier({ stat: 'ct', delta: 1 })
    const result = composeUnitView([subProfile], [modifier], [])

    const ctStat = result.subProfiles[0].stats['ct']
    expect(ctStat.value).toBe('3+')
    expect(ctStat.delta).toBe(1)
    expect(ctStat.modified).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Test 5 — Dash base stat ("-") — value unchanged
// ---------------------------------------------------------------------------

describe('[AC2] composeUnitView — dash base stat', () => {
  it('[2.3-UNIT-005] f="-" + delta:+1 → value="-" unchanged, delta=1, modified=true', () => {
    const subProfile = makeSubProfile('Cavaliers', {
      m: '8',
      cc: '3',
      ct: '-',
      f: '-',
      e: '4',
      pv: '1',
      i: '2',
      a: '1',
      cd: '7',
    })
    const modifier = makeModifier({ stat: 'f', delta: 1 })
    const result = composeUnitView([subProfile], [modifier], [])

    const fStat = result.subProfiles[0].stats['f']
    expect(fStat.value).toBe('-')
    expect(fStat.delta).toBe(1)
    expect(fStat.modified).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Test 6 — Zero base stat ("0") treated as numeric
// ---------------------------------------------------------------------------

describe('[AC2] composeUnitView — zero base stat is numeric', () => {
  it('[2.3-UNIT-006] pv="0" + delta:+1 → value="1" (arithmetic applied), modified=true', () => {
    const subProfile = makeSubProfile('Mangler Squig', {
      m: '3D6',
      cc: '4',
      ct: '0',
      f: '5',
      e: '5',
      pv: '0',
      i: '3',
      a: 'D6',
      cd: '10',
    })
    const modifier = makeModifier({ stat: 'pv', delta: 1 })
    const result = composeUnitView([subProfile], [modifier], [])

    const pvStat = result.subProfiles[0].stats['pv']
    expect(pvStat.value).toBe('1')
    expect(pvStat.delta).toBe(1)
    expect(pvStat.modified).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Test 7 — Multiple sub-profiles
// ---------------------------------------------------------------------------

describe('[AC3] composeUnitView — multiple sub-profiles', () => {
  it('[2.3-UNIT-007] two sub-profiles → output has 2 entries with correct labels', () => {
    const sp1 = makeSubProfile('Night Goblin Warboss', {
      m: '4',
      cc: '5',
      ct: '3',
      f: '4',
      e: '4',
      pv: '2',
      i: '4',
      a: '3',
      cd: '8',
    })
    const sp2 = {
      ...makeSubProfile('Giant Cave Squig', {
        m: '3D6',
        cc: '4',
        ct: '-',
        f: '5',
        e: '4',
        pv: '3',
        i: '2',
        a: '3',
        cd: '-',
      }),
      id: 'sp-2',
      sortOrder: 1,
    }

    const result = composeUnitView([sp1, sp2], [], [])

    expect(result.subProfiles).toHaveLength(2)
    expect(result.subProfiles[0].label).toBe('Night Goblin Warboss')
    expect(result.subProfiles[1].label).toBe('Giant Cave Squig')
  })
})

// ---------------------------------------------------------------------------
// Test 8 — Empty stat_modifiers → clean output
// ---------------------------------------------------------------------------

describe('[AC1] composeUnitView — empty modifiers array', () => {
  it('[2.3-UNIT-008] empty stat_modifiers returns ComposedUnitView with deltas=[] and gains=[]', () => {
    const subProfile = makeSubProfile('Unité test', {
      m: '4',
      cc: '3',
      ct: '3',
      f: '3',
      e: '3',
      pv: '1',
      i: '3',
      a: '1',
      cd: '7',
    })
    const result = composeUnitView([subProfile], [], [])

    expect(result.deltas).toEqual([])
    expect(result.gains).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Test 9 — Active unit gains present in output
// ---------------------------------------------------------------------------

describe('[AC2] composeUnitView — active unit gains included in output', () => {
  it('[2.3-UNIT-009] active unit_gain is present in result.gains', () => {
    const subProfile = makeSubProfile('Boucliers', {
      m: '4',
      cc: '3',
      ct: '3',
      f: '3',
      e: '3',
      pv: '1',
      i: '3',
      a: '1',
      cd: '7',
    })
    const gain = makeGain({ description: 'Mur de boucliers', active: true })
    const result = composeUnitView([subProfile], [], [gain])

    expect(result.gains).toHaveLength(1)
    expect(result.gains[0].description).toBe('Mur de boucliers')
  })
})

// ---------------------------------------------------------------------------
// Test 10 — Inactive unit gains excluded from output (AC per task 3.5)
// ---------------------------------------------------------------------------

describe('[AC2] composeUnitView — inactive unit gains excluded', () => {
  it('[2.3-UNIT-010] inactive unit_gain (active=false) is NOT present in result.gains', () => {
    const subProfile = makeSubProfile('Guerriers', {
      m: '4',
      cc: '3',
      ct: '3',
      f: '3',
      e: '3',
      pv: '1',
      i: '3',
      a: '1',
      cd: '7',
    })
    const gain = makeGain({ description: 'Capacité inactive', active: false })
    const result = composeUnitView([subProfile], [], [gain])

    expect(result.gains).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Test 11 — StatEntry shape validation
// ---------------------------------------------------------------------------

describe('[AC1] composeUnitView — ComposedSubProfile.stats entry shape', () => {
  it('[2.3-UNIT-011] each stat entry has the correct { value, delta, modified } shape', () => {
    const subProfile = makeSubProfile('Infanterie', {
      m: '4',
      cc: '3',
      ct: '3',
      f: '3',
      e: '3',
      pv: '1',
      i: '3',
      a: '1',
      cd: '7',
    })
    const result = composeUnitView([subProfile], [], [])
    const stat = result.subProfiles[0].stats['m']

    expect(stat).toHaveProperty('value')
    expect(stat).toHaveProperty('delta')
    expect(stat).toHaveProperty('modified')
    expect(typeof stat.value).toBe('string')
    expect(stat.delta === null || typeof stat.delta === 'number').toBe(true)
    expect(typeof stat.modified).toBe('boolean')
  })
})

// ---------------------------------------------------------------------------
// Test 12 — Multiple modifiers on same stat are summed
// ---------------------------------------------------------------------------

describe('[AC2] composeUnitView — multiple modifiers on same stat are summed', () => {
  it('[2.3-UNIT-012] two modifiers on cc (+1 and +2) → cc value = base+3, delta=3', () => {
    const subProfile = makeSubProfile('Élite', {
      m: '4',
      cc: '4',
      ct: '3',
      f: '4',
      e: '3',
      pv: '1',
      i: '4',
      a: '1',
      cd: '8',
    })
    const mod1 = makeModifier({ id: 'mod-1', stat: 'cc', delta: 1 })
    const mod2 = makeModifier({ id: 'mod-2', stat: 'cc', delta: 2 })
    const result = composeUnitView([subProfile], [mod1, mod2], [])

    const ccStat = result.subProfiles[0].stats['cc']
    expect(ccStat.value).toBe('7')
    expect(ccStat.delta).toBe(3)
    expect(ccStat.modified).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Test 13 — D6 base stat (non-numeric) — value unchanged
// ---------------------------------------------------------------------------

describe('[AC2] composeUnitView — dice expression base stat', () => {
  it('[2.3-UNIT-013] a="D6" + delta:+1 → value="D6" unchanged (non-numeric), modified=true', () => {
    const subProfile = makeSubProfile('Mangler Squig', {
      m: '3D6',
      cc: '4',
      ct: '0',
      f: '5',
      e: '5',
      pv: '3',
      i: '3',
      a: 'D6',
      cd: '10',
    })
    const modifier = makeModifier({ stat: 'a', delta: 1 })
    const result = composeUnitView([subProfile], [modifier], [])

    const aStat = result.subProfiles[0].stats['a']
    expect(aStat.value).toBe('D6')
    expect(aStat.delta).toBe(1)
    expect(aStat.modified).toBe(true)
  })
})
