import { describe, it, expect } from 'vitest'
import assert from 'node:assert'
import { composeUnitView } from '../../lib/delta-composer'
import type { StatModifier, UnitGain } from '../../lib/delta-composer'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type StatOverrides = Partial<{
  m: string | null
  cc: string | null
  ct: string | null
  f: string | null
  e: string | null
  pv: string | null
  i: string | null
  a: string | null
  cd: string | null
}>

function makeSubProfile(
  id: string,
  unitId: string,
  label: string,
  isMount: boolean,
  stats: StatOverrides = {},
) {
  return {
    id,
    unitId,
    sortOrder: isMount ? 1 : 0,
    label,
    isMount,
    m: stats.m ?? '-',
    cc: stats.cc ?? '-',
    ct: stats.ct ?? '-',
    f: stats.f ?? '-',
    e: stats.e ?? '-',
    pv: stats.pv ?? '-',
    i: stats.i ?? '-',
    a: stats.a ?? '-',
    cd: stats.cd ?? '-',
  }
}

const NO_GAINS: UnitGain[] = []

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('composeUnitView — cavalry mount rule', () => {
  it('rider has stat — mods apply to rider, not mount', () => {
    const subProfiles = [
      makeSubProfile('sp-rider', 'u1', 'Cavalier', false, { cc: '4', ct: '3' }),
      makeSubProfile('sp-mount', 'u1', 'Monture', true, { cc: '3', ct: '3' }),
    ]

    const modifiers: StatModifier[] = [
      { id: 'mod1', unitId: 'u1', stat: 'cc', delta: 1, source: 'Test', temporary: false },
    ]

    const result = composeUnitView(subProfiles, modifiers, NO_GAINS)

    const rider = result.subProfiles.find((sp) => !sp.isMount)
    const mount = result.subProfiles.find((sp) => sp.isMount)
    assert(rider !== undefined, 'rider sub-profile must exist')
    assert(mount !== undefined, 'mount sub-profile must exist')
    assert(rider.stats.cc !== undefined, 'rider.stats.cc must exist')
    assert(mount.stats.cc !== undefined, 'mount.stats.cc must exist')
    expect(rider.stats.cc.delta).toBe(1)
    expect(mount.stats.cc.delta).toBeNull()
  })

  it('rider lacks stat — mods apply to mount', () => {
    const subProfiles = [
      makeSubProfile('sp-rider', 'u1', 'Cavalier', false, { ct: '-' }),
      makeSubProfile('sp-mount', 'u1', 'Monture', true, { ct: '3' }),
    ]

    const modifiers: StatModifier[] = [
      { id: 'mod1', unitId: 'u1', stat: 'ct', delta: 1, source: 'Test', temporary: false },
    ]

    const result = composeUnitView(subProfiles, modifiers, NO_GAINS)

    const rider = result.subProfiles.find((sp) => !sp.isMount)
    const mount = result.subProfiles.find((sp) => sp.isMount)
    assert(rider !== undefined, 'rider sub-profile must exist')
    assert(mount !== undefined, 'mount sub-profile must exist')
    assert(rider.stats.ct !== undefined, 'rider.stats.ct must exist')
    assert(mount.stats.ct !== undefined, 'mount.stats.ct must exist')
    expect(rider.stats.ct.delta).toBeNull()
    expect(mount.stats.ct.delta).toBe(1)
  })
})
