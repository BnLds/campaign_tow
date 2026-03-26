// Campaign TOW — Unit tests for InitialConsequenceStep helpers
// Tests getFilteredOptions, buildConsequenceEntry, getChipLabel

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getFilteredOptions,
  buildConsequenceEntry,
  getChipLabel,
  CHARACTER_UNIT_TYPE,
} from '../helpers'
import type { ConsequenceEntry } from '../../../lib/validators'

// ---------------------------------------------------------------------------
// getFilteredOptions
// ---------------------------------------------------------------------------

describe('getFilteredOptions', () => {
  it('returns 3 character options for Personnages unit type', () => {
    const options = getFilteredOptions(CHARACTER_UNIT_TYPE)
    expect(options).toHaveLength(3)
    const types = options.map((o) => o.type)
    expect(types).toContain('permanent_injury')
    expect(types).toContain('grave_injury')
    expect(types).toContain('haine')
  })

  it('returns 3 unit options for non-Personnages unit type', () => {
    const options = getFilteredOptions('Infanterie')
    expect(options).toHaveLength(3)
    const types = options.map((o) => o.type)
    expect(types).toContain('pertes_catastrophiques')
    expect(types).toContain('moral_brise')
    expect(types).toContain('rancune')
  })
})

// ---------------------------------------------------------------------------
// buildConsequenceEntry — 6 valid type cases
// ---------------------------------------------------------------------------

describe('buildConsequenceEntry — valid cases', () => {
  it('builds permanent_injury entry with stat and delta: -1', () => {
    const result = buildConsequenceEntry({
      type: 'permanent_injury',
      unitId: 'unit-1',
      stat: 'cc',
      player: null,
    })
    expect(result).toEqual({ unitId: 'unit-1', type: 'permanent_injury', stat: 'cc', delta: -1 })
  })

  it('builds grave_injury entry (no stat, no delta)', () => {
    const result = buildConsequenceEntry({
      type: 'grave_injury',
      unitId: 'unit-1',
      stat: null,
      player: null,
    })
    expect(result).toEqual({ unitId: 'unit-1', type: 'grave_injury' })
  })

  it('builds haine entry with opponentPlayerName', () => {
    const result = buildConsequenceEntry({
      type: 'haine',
      unitId: 'unit-1',
      stat: null,
      player: { playerId: 'p-1', playerDisplayName: 'Alice' },
    })
    expect(result).toEqual({ unitId: 'unit-1', type: 'haine', opponentPlayerName: 'Alice' })
  })

  it('builds rancune entry with opponentPlayerName', () => {
    const result = buildConsequenceEntry({
      type: 'rancune',
      unitId: 'unit-1',
      stat: null,
      player: { playerId: 'p-2', playerDisplayName: 'Bob' },
    })
    expect(result).toEqual({ unitId: 'unit-1', type: 'rancune', opponentPlayerName: 'Bob' })
  })

  it('builds pertes_catastrophiques entry', () => {
    const result = buildConsequenceEntry({
      type: 'pertes_catastrophiques',
      unitId: 'unit-1',
      stat: null,
      player: null,
    })
    expect(result).toEqual({ unitId: 'unit-1', type: 'pertes_catastrophiques' })
  })

  it('builds moral_brise entry', () => {
    const result = buildConsequenceEntry({
      type: 'moral_brise',
      unitId: 'unit-1',
      stat: null,
      player: null,
    })
    expect(result).toEqual({ unitId: 'unit-1', type: 'moral_brise' })
  })
})

// ---------------------------------------------------------------------------
// buildConsequenceEntry — 3 null cases (with console.warn spy)
// ---------------------------------------------------------------------------

describe('buildConsequenceEntry — null cases', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('returns null and warns when permanent_injury has no stat', () => {
    const result = buildConsequenceEntry({
      type: 'permanent_injury',
      unitId: 'unit-1',
      stat: null,
      player: null,
    })
    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('permanent_injury')
    )
  })

  it('returns null and warns when haine has no player', () => {
    const result = buildConsequenceEntry({
      type: 'haine',
      unitId: 'unit-1',
      stat: null,
      player: null,
    })
    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('haine')
    )
  })

  it('returns null and warns when rancune has no player', () => {
    const result = buildConsequenceEntry({
      type: 'rancune',
      unitId: 'unit-1',
      stat: null,
      player: null,
    })
    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('rancune')
    )
  })
})

// ---------------------------------------------------------------------------
// getChipLabel — 7 branches
// ---------------------------------------------------------------------------

describe('getChipLabel', () => {
  it('returns label with stat description for permanent_injury (known stat)', () => {
    const entry = { unitId: 'u', type: 'permanent_injury', stat: 'cc', delta: -1 } as ConsequenceEntry
    expect(getChipLabel(entry)).toBe('Blessure Permanente — -1 CC')
  })

  it('returns label with raw stat for permanent_injury (unknown stat)', () => {
    const entry = { unitId: 'u', type: 'permanent_injury', stat: 'unknown_stat', delta: -1 } as ConsequenceEntry
    expect(getChipLabel(entry)).toBe('Blessure Permanente — unknown_stat')
  })

  it('returns "Blessure Grave" for grave_injury', () => {
    const entry = { unitId: 'u', type: 'grave_injury', stat: 'e', delta: -1 } as ConsequenceEntry
    expect(getChipLabel(entry)).toBe('Blessure Grave')
  })

  it('returns "Haine — <name>" for haine', () => {
    const entry = { unitId: 'u', type: 'haine', opponentPlayerName: 'Alice' } as ConsequenceEntry
    expect(getChipLabel(entry)).toBe('Haine — Alice')
  })

  it('returns "Rancune — <name>" for rancune', () => {
    const entry = { unitId: 'u', type: 'rancune', opponentPlayerName: 'Bob' } as ConsequenceEntry
    expect(getChipLabel(entry)).toBe('Rancune — Bob')
  })

  it('returns "Pertes Catastrophiques" for pertes_catastrophiques', () => {
    const entry = { unitId: 'u', type: 'pertes_catastrophiques' } as ConsequenceEntry
    expect(getChipLabel(entry)).toBe('Pertes Catastrophiques')
  })

  it('returns "Moral Brisé" for moral_brise', () => {
    const entry = { unitId: 'u', type: 'moral_brise' } as ConsequenceEntry
    expect(getChipLabel(entry)).toBe('Moral Brisé')
  })
})
