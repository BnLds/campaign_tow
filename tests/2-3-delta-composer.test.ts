// tests/2-3-delta-composer.test.ts
// Story 2.3: Unit Card Display with Campaign Deltas
// Status: RED — written before implementation (TDD)
//
// Tests for the pure `composeUnitView` function.
// Source file does NOT exist yet: src/lib/delta-composer.ts
// All tests will fail with import errors until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { composeUnitView, parseGainStat, computeEffectiveStats, STAT_CAP, UNCAPPED_STATS } from '../src/lib/delta-composer'
import type { StatModifier, UnitGain } from '../src/lib/delta-composer'

// ---------------------------------------------------------------------------
// Helpers — minimal test fixtures
// ---------------------------------------------------------------------------

function makeSubProfile(label: string, stats: Record<string, string>, isMount = false) {
  return {
    id: 'sp-1',
    unitId: 'unit-1',
    sortOrder: 0,
    label,
    isMount,
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
    type: 'tier_up',
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
  it('[2.3-UNIT-004] ct="3+" + delta:+1 → value="3++1" (non-numeric with suffix), delta=1, modified=true', () => {
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
    expect(ctStat.value).toBe('3++1')
    expect(ctStat.delta).toBe(1)
    expect(ctStat.modified).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Test 5 — Dash base stat ("-") — value unchanged
// ---------------------------------------------------------------------------

describe('[AC2] composeUnitView — dash base stat', () => {
  it('[2.3-UNIT-005] f="-" + delta:+1 → value="-" unchanged, delta=null, modified=false (stat absent)', () => {
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
    expect(fStat.delta).toBeNull()
    expect(fStat.modified).toBe(false)
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

describe('[AC2] composeUnitView — unit gains included in output', () => {
  it('[2.3-UNIT-009] unit_gain is present in result.gains', () => {
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
    const gain = makeGain({ description: 'Mur de boucliers' })
    const result = composeUnitView([subProfile], [], [gain])

    expect(result.gains).toHaveLength(1)
    expect(result.gains[0].description).toBe('Mur de boucliers')
  })
})

// ---------------------------------------------------------------------------
// Test 10 — All unit gains included in output
// ---------------------------------------------------------------------------

describe('[AC2] composeUnitView — all unit gains included', () => {
  it('[2.3-UNIT-010] all unit_gains are present in result.gains', () => {
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
    const gain = makeGain({ description: 'Capacité acquise' })
    const result = composeUnitView([subProfile], [], [gain])

    expect(result.gains).toHaveLength(1)
    expect(result.gains[0].description).toBe('Capacité acquise')
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
  it('[2.3-UNIT-013] a="D6" + delta:+1 → value="D6+1" (non-numeric with suffix), modified=true', () => {
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
    expect(aStat.value).toBe('D6+1')
    expect(aStat.delta).toBe(1)
    expect(aStat.modified).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Test 13b — Non-numeric with dice expression "3D6" + delta:+1 → "3D6+1"
// ---------------------------------------------------------------------------

describe('[AC2] composeUnitView — dice expression 3D6 with delta', () => {
  it('[2.3-UNIT-013b] m="3D6" + delta:+1 → value="3D6+1", modified=true', () => {
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
    const modifier = makeModifier({ stat: 'm', delta: 1 })
    const result = composeUnitView([subProfile], [modifier], [])

    const mStat = result.subProfiles[0].stats['m']
    expect(mStat.value).toBe('3D6+1')
    expect(mStat.delta).toBe(1)
    expect(mStat.modified).toBe(true)
  })

  it('[2.3-UNIT-013c] m="3D6" + delta:-1 → value="3D6-1", modified=true', () => {
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
    const modifier = makeModifier({ stat: 'm', delta: -1 })
    const result = composeUnitView([subProfile], [modifier], [])

    const mStat = result.subProfiles[0].stats['m']
    expect(mStat.value).toBe('3D6-1')
    expect(mStat.delta).toBe(-1)
    expect(mStat.modified).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Test 13d — Dash stat "-" on mount subprofile: cd="-" is ignored even without modifiers
// ---------------------------------------------------------------------------

describe('[AC2] composeUnitView — dash stat cd="-" modifier ignored', () => {
  it('[2.3-UNIT-013d] cd="-" + delta:+1 → value="-", modified=false, delta=null (unit has no cd)', () => {
    const subProfile = makeSubProfile('Giant Cave Squig', {
      m: '3D6',
      cc: '4',
      ct: '-',
      f: '5',
      e: '4',
      pv: '3',
      i: '2',
      a: '3',
      cd: '-',
    })
    const modifier = makeModifier({ stat: 'cd', delta: 1 })
    const result = composeUnitView([subProfile], [modifier], [])

    const cdStat = result.subProfiles[0].stats['cd']
    expect(cdStat.value).toBe('-')
    expect(cdStat.delta).toBeNull()
    expect(cdStat.modified).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Test 14 — Mount sub-profile is excluded from modifier application
// ---------------------------------------------------------------------------

describe('[AC1] composeUnitView — mount sub-profile excluded from modifiers', () => {
  it('[2.3-UNIT-014] rider(isMount=false) receives modifier, mount(isMount=true) does not', () => {
    const rider = {
      ...makeSubProfile('Personnage', { m: '4', cc: '5', ct: '3', f: '4', e: '4', pv: '2', i: '4', a: '3', cd: '8' }, false),
      id: 'sp-rider',
      sortOrder: 0,
    }
    const mount = {
      ...makeSubProfile('Destrier', { m: '8', cc: '3', ct: '-', f: '4', e: '4', pv: '1', i: '3', a: '2', cd: '-' }, true),
      id: 'sp-mount',
      sortOrder: 1,
    }
    const modifier = makeModifier({ stat: 'cc', delta: 1 })
    const result = composeUnitView([rider, mount], [modifier], [])

    // Rider receives the modifier
    expect(result.subProfiles[0].stats['cc'].modified).toBe(true)
    expect(result.subProfiles[0].stats['cc'].delta).toBe(1)
    // Mount does NOT receive the modifier
    expect(result.subProfiles[1].stats['cc'].modified).toBe(false)
    expect(result.subProfiles[1].stats['cc'].delta).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Test 15 — Multi-combatant unit: both sub-profiles receive modifiers
// ---------------------------------------------------------------------------

describe('[AC2] composeUnitView — multi-combatant unit: both profiles modified', () => {
  it('[2.3-UNIT-015] two combatant profiles (both isMount=false) both receive the modifier', () => {
    const goblin = {
      ...makeSubProfile('Gobelin Nocturne', { m: '4', cc: '3', ct: '3', f: '3', e: '3', pv: '1', i: '3', a: '1', cd: '5' }, false),
      id: 'sp-goblin',
      sortOrder: 0,
    }
    const squig = {
      ...makeSubProfile('Cave Squig', { m: '3D6', cc: '4', ct: '-', f: '5', e: '4', pv: '2', i: '2', a: '3', cd: '-' }, false),
      id: 'sp-squig',
      sortOrder: 1,
    }
    const modifier = makeModifier({ stat: 'cc', delta: 1 })
    const result = composeUnitView([goblin, squig], [modifier], [])

    // Both profiles receive the modifier
    expect(result.subProfiles[0].stats['cc'].modified).toBe(true)
    expect(result.subProfiles[0].stats['cc'].delta).toBe(1)
    expect(result.subProfiles[1].stats['cc'].modified).toBe(true)
    expect(result.subProfiles[1].stats['cc'].delta).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Test 16 — isMount is propagated to ComposedSubProfile
// ---------------------------------------------------------------------------

describe('[AC1] composeUnitView — isMount propagated to ComposedSubProfile', () => {
  it('[2.3-UNIT-016] isMount=true on input sub-profile is present as true on output ComposedSubProfile', () => {
    const rider = {
      ...makeSubProfile('Chevalier', { m: '4', cc: '5', ct: '3', f: '4', e: '4', pv: '2', i: '4', a: '3', cd: '8' }, false),
      id: 'sp-rider',
      sortOrder: 0,
    }
    const mount = {
      ...makeSubProfile('Destrier', { m: '8', cc: '3', ct: '-', f: '4', e: '4', pv: '1', i: '3', a: '2', cd: '-' }, true),
      id: 'sp-mount',
      sortOrder: 1,
    }
    const result = composeUnitView([rider, mount], [], [])

    expect(result.subProfiles[0].isMount).toBe(false)
    expect(result.subProfiles[1].isMount).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Test 17 — parseGainStat: stat gains parsed correctly
// ---------------------------------------------------------------------------

describe('[AC2] parseGainStat — stat gain descriptions', () => {
  it('[2.3-UNIT-017] "+1 CC" → { stat: "cc", delta: 1 }', () => {
    expect(parseGainStat('+1 CC')).toEqual({ stat: 'cc', delta: 1 })
  })

  it('[2.3-UNIT-018] "+1 Initiative" → { stat: "i", delta: 1 }', () => {
    expect(parseGainStat('+1 Initiative')).toEqual({ stat: 'i', delta: 1 })
  })

  it('[2.3-UNIT-019] "+1 Mouvement (unique)" → { stat: "m", delta: 1 }', () => {
    expect(parseGainStat('+1 Mouvement (unique)')).toEqual({ stat: 'm', delta: 1 })
  })

  it('[2.3-UNIT-020] "+2 Force" → { stat: "f", delta: 2 }', () => {
    expect(parseGainStat('+2 Force')).toEqual({ stat: 'f', delta: 2 })
  })

  it('[2.3-UNIT-021] non-stat gain returns null', () => {
    expect(parseGainStat('Champion')).toBeNull()
    expect(parseGainStat('Bannière de guerre')).toBeNull()
  })

  it('[2.3-UNIT-022] legacy "+1 CC ou +1 CT" → { stat: "cc", delta: 1 } (backward compat)', () => {
    expect(parseGainStat('+1 CC ou +1 CT')).toEqual({ stat: 'cc', delta: 1 })
  })
})

// ---------------------------------------------------------------------------
// Test 18 — composeUnitView: stat gains affect composed stats
// ---------------------------------------------------------------------------

describe('[AC2] composeUnitView — unit gains affect stats', () => {
  it('[2.3-UNIT-023] gain "+1 CC" on cc=3 → cc value="4", delta=1, modified=true', () => {
    const subProfile = makeSubProfile('Vétérans', {
      m: '4', cc: '3', ct: '3', f: '3', e: '3', pv: '1', i: '3', a: '1', cd: '7',
    })
    const gain = makeGain({ description: '+1 CC' })
    const result = composeUnitView([subProfile], [], [gain])

    const ccStat = result.subProfiles[0].stats['cc']
    expect(ccStat.value).toBe('4')
    expect(ccStat.delta).toBe(1)
    expect(ccStat.modified).toBe(true)
  })

  it('[2.3-UNIT-024] gain + explicit modifier stack correctly', () => {
    const subProfile = makeSubProfile('Élite', {
      m: '4', cc: '4', ct: '3', f: '4', e: '3', pv: '1', i: '4', a: '1', cd: '8',
    })
    const modifier = makeModifier({ stat: 'cc', delta: 1 })
    const gain = makeGain({ description: '+1 CC' })
    const result = composeUnitView([subProfile], [modifier], [gain])

    const ccStat = result.subProfiles[0].stats['cc']
    expect(ccStat.value).toBe('6')  // 4 + 1(mod) + 1(gain)
    expect(ccStat.delta).toBe(2)
    expect(ccStat.modified).toBe(true)
  })

  it('[2.3-UNIT-025] non-stat gain does not affect stats', () => {
    const subProfile = makeSubProfile('Gardes', {
      m: '4', cc: '3', ct: '3', f: '3', e: '3', pv: '1', i: '3', a: '1', cd: '7',
    })
    const gain = makeGain({ description: 'Bannière de guerre' })
    const result = composeUnitView([subProfile], [], [gain])

    for (const key of ['m', 'cc', 'ct', 'f', 'e', 'pv', 'i', 'a', 'cd']) {
      expect(result.subProfiles[0].stats[key].modified).toBe(false)
    }
    // But gain is still in gains list
    expect(result.gains).toHaveLength(1)
  })

  it('[2.3-UNIT-026] gain does NOT affect mount sub-profile', () => {
    const rider = {
      ...makeSubProfile('Chevalier', { m: '4', cc: '5', ct: '3', f: '4', e: '4', pv: '2', i: '4', a: '3', cd: '8' }, false),
      id: 'sp-rider', sortOrder: 0,
    }
    const mount = {
      ...makeSubProfile('Destrier', { m: '8', cc: '3', ct: '-', f: '4', e: '4', pv: '1', i: '3', a: '2', cd: '-' }, true),
      id: 'sp-mount', sortOrder: 1,
    }
    const gain = makeGain({ description: '+1 CC' })
    const result = composeUnitView([rider, mount], [], [gain])

    expect(result.subProfiles[0].stats['cc'].modified).toBe(true)
    expect(result.subProfiles[1].stats['cc'].modified).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// STAT_CAP — stat capping tests
// ---------------------------------------------------------------------------

describe('[CAP] composeUnitView — stat cap at 10', () => {
  it('[CAP-001] numeric stat 9 + delta +2 → value "11" (CC uncapped per campaign rules), delta=2, modified=true', () => {
    // Only Commandement is capped at 10 — other stats like CC have no upper cap
    const subProfile = makeSubProfile('Élite', {
      m: '4', cc: '9', ct: '3', f: '3', e: '3', pv: '1', i: '3', a: '1', cd: '7',
    })
    const modifier = makeModifier({ stat: 'cc', delta: 2 })
    const result = composeUnitView([subProfile], [modifier], [])

    const ccStat = result.subProfiles[0].stats['cc']
    expect(ccStat.value).toBe('11')
    expect(ccStat.delta).toBe(2)
    expect(ccStat.modified).toBe(true)
  })

  it('[CAP-002] numeric stat 10 + delta +1 → value "10" (already at cap), delta=1', () => {
    const subProfile = makeSubProfile('Élite', {
      m: '4', cc: '3', ct: '3', f: '3', e: '3', pv: '1', i: '3', a: '1', cd: '10',
    })
    const modifier = makeModifier({ stat: 'cd', delta: 1 })
    const result = composeUnitView([subProfile], [modifier], [])

    const cdStat = result.subProfiles[0].stats['cd']
    expect(cdStat.value).toBe('10')
    expect(cdStat.delta).toBe(1)
    expect(cdStat.modified).toBe(true)
  })

  it('[CAP-003] numeric stat 8 + delta +1 → value "9" (no cap needed)', () => {
    const subProfile = makeSubProfile('Guerriers', {
      m: '4', cc: '8', ct: '3', f: '3', e: '3', pv: '1', i: '3', a: '1', cd: '7',
    })
    const modifier = makeModifier({ stat: 'cc', delta: 1 })
    const result = composeUnitView([subProfile], [modifier], [])

    expect(result.subProfiles[0].stats['cc'].value).toBe('9')
  })

  it('[CAP-004] M (Mouvement) is exempt from cap: m=12 + delta +3 → value "15"', () => {
    const subProfile = makeSubProfile('Cavalier rapide', {
      m: '12', cc: '3', ct: '3', f: '3', e: '3', pv: '1', i: '3', a: '1', cd: '7',
    })
    const modifier = makeModifier({ stat: 'm', delta: 3 })
    const result = composeUnitView([subProfile], [modifier], [])

    expect(result.subProfiles[0].stats['m'].value).toBe('15')
  })

  it('[CAP-005] non-numeric stat "3D6" + delta +5 → NOT capped (suffix format)', () => {
    const subProfile = makeSubProfile('Mangler', {
      m: '3D6', cc: '4', ct: '0', f: '5', e: '5', pv: '3', i: '3', a: 'D6', cd: '10',
    })
    const modifier = makeModifier({ stat: 'm', delta: 5 })
    const result = composeUnitView([subProfile], [modifier], [])

    expect(result.subProfiles[0].stats['m'].value).toBe('3D6+5')
  })
})

// ---------------------------------------------------------------------------
// computeEffectiveStats tests
// ---------------------------------------------------------------------------

describe('[CAP] computeEffectiveStats', () => {
  it('[CAP-006] base CC=8, gains=["+1 CC", "+1 CC"] → CC=10', () => {
    const base = { m: 4, cc: 8, ct: 3, f: 3, e: 3, pv: 1, i: 3, a: 1, cd: 7 }
    const gains: UnitGain[] = [
      { id: 'g1', unitId: 'u1', description: '+1 CC', type: 'tier_up' },
      { id: 'g2', unitId: 'u1', description: '+1 CC', type: 'tier_up' },
    ]
    const result = computeEffectiveStats(base, gains)
    expect(result.cc).toBe(10)
  })

  it('[CAP-007] base null (non-numeric) stays null', () => {
    const base = { m: null, cc: 4, ct: 3, f: 3, e: 3, pv: 1, i: 3, a: 1, cd: 7 }
    const gains: UnitGain[] = [
      { id: 'g1', unitId: 'u1', description: '+1 Mouvement (unique)', type: 'tier_up' },
    ]
    const result = computeEffectiveStats(base, gains)
    expect(result.m).toBeNull()
  })

  it('[CAP-008] gains with non-stat descriptions are ignored', () => {
    const base = { m: 4, cc: 4, ct: 3, f: 3, e: 3, pv: 1, i: 3, a: 1, cd: 7 }
    const gains: UnitGain[] = [
      { id: 'g1', unitId: 'u1', description: 'Champion', type: 'honour_champion' },
      { id: 'g2', unitId: 'u1', description: 'Bannière de guerre', type: 'honour_banner' },
    ]
    const result = computeEffectiveStats(base, gains)
    expect(result.cc).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// STAT_CAP export
// ---------------------------------------------------------------------------

describe('[CAP] STAT_CAP export', () => {
  it('[CAP-009] STAT_CAP is exported and equals 10', () => {
    expect(STAT_CAP).toBe(10)
  })

  it('[CAP-010] UNCAPPED_STATS contains "m"', () => {
    expect(UNCAPPED_STATS).toContain('m')
  })
})
