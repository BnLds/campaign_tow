// tests/server-fns/guards.test.ts
// Unit tests for src/server-fns/guards.ts
// Tests all 4 guards × 4 cases each = 16 test cases

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  assertUnitBelongsToArmy,
  assertModifierBelongsToArmy,
  assertGainBelongsToArmy,
  assertSubProfileBelongsToArmy,
} from '../../src/server-fns/guards'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockUnit = {
  id: 'unit-1',
  armyId: 'army-1',
  name: 'Test',
  nickname: null,
  type: 'Personnages',
  xp: 10,
  status: 'active',
}

const mockModifier = { id: 'mod-1', unitId: 'unit-1' }
const mockGain = { id: 'gain-1', unitId: 'unit-1' }
const mockSubProfile = { id: 'sp-1', unitId: 'unit-1', isMount: false }

// ---------------------------------------------------------------------------
// Mock dynamic imports
// vi.mock is hoisted — path resolves relative to project root via tsconfigPaths
// ---------------------------------------------------------------------------

const mockGetUnitById = vi.fn()
const mockGetStatModifierById = vi.fn()
const mockGetUnitGainById = vi.fn()
const mockGetSubProfileById = vi.fn()

vi.mock('../../src/db/queries', () => ({
  getUnitById: (...args: unknown[]) => mockGetUnitById(...args),
  getStatModifierById: (...args: unknown[]) => mockGetStatModifierById(...args),
  getUnitGainById: (...args: unknown[]) => mockGetUnitGainById(...args),
  getSubProfileById: (...args: unknown[]) => mockGetSubProfileById(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// assertUnitBelongsToArmy
// ---------------------------------------------------------------------------

describe('assertUnitBelongsToArmy', () => {
  it('[GUARD-001] returns ok:true with unit data when unit belongs to the army', async () => {
    mockGetUnitById.mockResolvedValue(mockUnit)

    const result = await assertUnitBelongsToArmy('unit-1', 'army-1')

    expect(result).toEqual({ ok: true, data: mockUnit })
  })

  it('[GUARD-002] returns FORBIDDEN when getUnitById returns null', async () => {
    mockGetUnitById.mockResolvedValue(null)

    const result = await assertUnitBelongsToArmy('unit-1', 'army-1')

    expect(result).toEqual({
      ok: false,
      result: { success: false, error: { code: 'FORBIDDEN', message: "Cette unité n'appartient pas à cette armée" } },
    })
  })

  it('[GUARD-003] returns FORBIDDEN when unit belongs to a different army', async () => {
    mockGetUnitById.mockResolvedValue({ ...mockUnit, armyId: 'army-other' })

    const result = await assertUnitBelongsToArmy('unit-1', 'army-1')

    expect(result).toEqual({
      ok: false,
      result: {
        success: false,
        error: { code: 'FORBIDDEN', message: "Cette unité n'appartient pas à cette armée" },
      },
    })
  })

  it('[GUARD-004] returned data matches the exact mock unit (identity check)', async () => {
    const unit = { ...mockUnit, armyId: 'army-1' }
    mockGetUnitById.mockResolvedValue(unit)

    const result = await assertUnitBelongsToArmy('unit-1', 'army-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toBe(unit)
    }
  })
})

// ---------------------------------------------------------------------------
// assertModifierBelongsToArmy
// ---------------------------------------------------------------------------

describe('assertModifierBelongsToArmy', () => {
  it('[GUARD-005] returns ok:true with modifier and unit when modifier belongs to army', async () => {
    mockGetStatModifierById.mockResolvedValue(mockModifier)
    mockGetUnitById.mockResolvedValue(mockUnit)

    const result = await assertModifierBelongsToArmy('mod-1', 'army-1')

    expect(result).toEqual({ ok: true, data: { modifier: mockModifier, unit: mockUnit } })
  })

  it('[GUARD-006] returns NOT_FOUND when getStatModifierById returns null', async () => {
    mockGetStatModifierById.mockResolvedValue(null)

    const result = await assertModifierBelongsToArmy('mod-1', 'army-1')

    expect(result).toEqual({
      ok: false,
      result: { success: false, error: { code: 'NOT_FOUND', message: 'Modificateur introuvable' } },
    })
  })

  it('[GUARD-007] returns FORBIDDEN when modifier unit belongs to a different army', async () => {
    mockGetStatModifierById.mockResolvedValue(mockModifier)
    mockGetUnitById.mockResolvedValue({ ...mockUnit, armyId: 'army-other' })

    const result = await assertModifierBelongsToArmy('mod-1', 'army-1')

    expect(result).toEqual({
      ok: false,
      result: {
        success: false,
        error: { code: 'FORBIDDEN', message: "Ce modificateur n'appartient pas à cette armée" },
      },
    })
  })

  it('[GUARD-008] returns FORBIDDEN when modifier exists but its unit is not found (orphan modifier)', async () => {
    mockGetStatModifierById.mockResolvedValue(mockModifier)
    mockGetUnitById.mockResolvedValue(null)

    const result = await assertModifierBelongsToArmy('mod-1', 'army-1')

    expect(result).toEqual({
      ok: false,
      result: { success: false, error: { code: 'FORBIDDEN', message: "Ce modificateur n'appartient pas à cette armée" } },
    })
  })
})

// ---------------------------------------------------------------------------
// assertGainBelongsToArmy
// ---------------------------------------------------------------------------

describe('assertGainBelongsToArmy', () => {
  it('[GUARD-009] returns ok:true with gain and unit when gain belongs to army', async () => {
    mockGetUnitGainById.mockResolvedValue(mockGain)
    mockGetUnitById.mockResolvedValue(mockUnit)

    const result = await assertGainBelongsToArmy('gain-1', 'army-1')

    expect(result).toEqual({ ok: true, data: { gain: mockGain, unit: mockUnit } })
  })

  it('[GUARD-010] returns NOT_FOUND when getUnitGainById returns null', async () => {
    mockGetUnitGainById.mockResolvedValue(null)

    const result = await assertGainBelongsToArmy('gain-1', 'army-1')

    expect(result).toEqual({
      ok: false,
      result: { success: false, error: { code: 'NOT_FOUND', message: 'Capacité introuvable' } },
    })
  })

  it('[GUARD-011] returns FORBIDDEN when gain unit belongs to a different army', async () => {
    mockGetUnitGainById.mockResolvedValue(mockGain)
    mockGetUnitById.mockResolvedValue({ ...mockUnit, armyId: 'army-other' })

    const result = await assertGainBelongsToArmy('gain-1', 'army-1')

    expect(result).toEqual({
      ok: false,
      result: {
        success: false,
        error: { code: 'FORBIDDEN', message: "Cette capacité n'appartient pas à cette armée" },
      },
    })
  })

  it('[GUARD-012] returns FORBIDDEN when gain exists but its unit is not found (orphan gain)', async () => {
    mockGetUnitGainById.mockResolvedValue(mockGain)
    mockGetUnitById.mockResolvedValue(null)

    const result = await assertGainBelongsToArmy('gain-1', 'army-1')

    expect(result).toEqual({
      ok: false,
      result: { success: false, error: { code: 'FORBIDDEN', message: "Cette capacité n'appartient pas à cette armée" } },
    })
  })
})

// ---------------------------------------------------------------------------
// assertSubProfileBelongsToArmy
// ---------------------------------------------------------------------------

describe('assertSubProfileBelongsToArmy', () => {
  it('[GUARD-013] returns ok:true with subProfile and unit when subProfile belongs to army', async () => {
    mockGetSubProfileById.mockResolvedValue(mockSubProfile)
    mockGetUnitById.mockResolvedValue(mockUnit)

    const result = await assertSubProfileBelongsToArmy('sp-1', 'army-1')

    expect(result).toEqual({ ok: true, data: { subProfile: mockSubProfile, unit: mockUnit } })
  })

  it('[GUARD-014] returns NOT_FOUND when getSubProfileById returns null', async () => {
    mockGetSubProfileById.mockResolvedValue(null)

    const result = await assertSubProfileBelongsToArmy('sp-1', 'army-1')

    expect(result).toEqual({
      ok: false,
      result: { success: false, error: { code: 'NOT_FOUND', message: 'Sous-profil introuvable' } },
    })
  })

  it('[GUARD-015] returns FORBIDDEN when subProfile unit belongs to a different army', async () => {
    mockGetSubProfileById.mockResolvedValue(mockSubProfile)
    mockGetUnitById.mockResolvedValue({ ...mockUnit, armyId: 'army-other' })

    const result = await assertSubProfileBelongsToArmy('sp-1', 'army-1')

    expect(result).toEqual({
      ok: false,
      result: {
        success: false,
        error: { code: 'FORBIDDEN', message: "Ce sous-profil n'appartient pas à cette armée" },
      },
    })
  })

  it('[GUARD-016] returns FORBIDDEN when subProfile exists but its unit is not found (orphan subProfile)', async () => {
    mockGetSubProfileById.mockResolvedValue(mockSubProfile)
    mockGetUnitById.mockResolvedValue(null)

    const result = await assertSubProfileBelongsToArmy('sp-1', 'army-1')

    expect(result).toEqual({
      ok: false,
      result: { success: false, error: { code: 'FORBIDDEN', message: "Ce sous-profil n'appartient pas à cette armée" } },
    })
  })
})
