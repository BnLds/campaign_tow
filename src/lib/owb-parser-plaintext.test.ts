// src/lib/owb-parser-plaintext.test.ts
// Tests for plain text format support in the OWB parser.
// Verifies: format detection, normalization, and end-to-end parsing of plain text exports.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseOwbExport, normalizePlainText } from './owb-parser'

const SAMPLE_PLAIN = readFileSync(
  resolve(__dirname, '__fixtures__/owb-plaintext-sample.txt'),
  'utf-8',
)

// ---------------------------------------------------------------------------
// Normalization — plain text → markdown conversion
// ---------------------------------------------------------------------------

describe('normalizePlainText — line transformations', () => {
  it('prepends "## " to army header and strips trailing comma', () => {
    const result = normalizePlainText(SAMPLE_PLAIN)
    const firstLine = result.split('\n')[0]
    expect(firstLine).toBe('## Royaumes Hauts Elfes [599 pts]')
  })

  it('preserves faction line unchanged', () => {
    const result = normalizePlainText(SAMPLE_PLAIN)
    const secondLine = result.split('\n')[1]
    expect(secondLine).toBe(
      'Warhammer: The Old World, Royaumes Hauts Elfes, Colonne de Bataille',
    )
  })

  it('converts section headers with "### " prefix and strips trailing comma', () => {
    const result = normalizePlainText(SAMPLE_PLAIN)
    expect(result).toContain('### Personnages [186 pts]')
    expect(result).toContain('### Unités de base [170 pts]')
    expect(result).toContain('### Unités spéciales [118 pts]')
    expect(result).toContain('### Unités rares [125 pts]')
  })

  it('prepends "- " to unit lines', () => {
    const result = normalizePlainText(SAMPLE_PLAIN)
    expect(result).toContain('- Noble [106 pts]')
    expect(result).toContain('- 15 Garde Maritime de Lothern [170 pts]')
    expect(result).toContain('- Char à Lions de Chrace [125 pts]')
  })

  it('converts option lines to " -# (...)" format', () => {
    const result = normalizePlainText(SAMPLE_PLAIN)
    expect(result).toContain(
      ' -# (Arme de base, Épée de Hoeth, Armure de plate complète, Général, À Pied, Graine de Renaissance, Gardien de Saphery)',
    )
  })

  it('converts sub-profile lines with " - " prefix and strips trailing comma', () => {
    const result = normalizePlainText(SAMPLE_PLAIN)
    expect(result).toContain(
      ' - [Noble] M(5) CC(6) CT(6) F(4) E(3) PV(2) I(5) A(3) Cd(9)',
    )
  })

  it('drops lone comma lines', () => {
    const result = normalizePlainText(SAMPLE_PLAIN)
    const lines = result.split('\n')
    const loneCommas = lines.filter((l) => /^,\s*$/.test(l))
    expect(loneCommas).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// End-to-end — parseOwbExport with plain text input
// ---------------------------------------------------------------------------

describe('parseOwbExport — plain text format (end-to-end)', () => {
  it('parses army name', () => {
    const result = parseOwbExport(SAMPLE_PLAIN)
    expect(result.name).toBe('Royaumes Hauts Elfes')
  })

  it('parses faction', () => {
    const result = parseOwbExport(SAMPLE_PLAIN)
    expect(result.faction).toBe('Royaumes Hauts Elfes')
  })

  it('parses total points', () => {
    const result = parseOwbExport(SAMPLE_PLAIN)
    expect(result.totalPoints).toBe(599)
  })

  it('returns 5 units', () => {
    const result = parseOwbExport(SAMPLE_PLAIN)
    expect(result.units).toHaveLength(5)
  })

  it('assigns correct unit types from section headers', () => {
    const result = parseOwbExport(SAMPLE_PLAIN)
    const types = result.units.map((u) => u.type)
    expect(types).toEqual([
      'Personnages',
      'Personnages',
      'Unités de base',
      'Unités spéciales',
      'Unités rares',
    ])
  })

  it('extracts unit names correctly', () => {
    const result = parseOwbExport(SAMPLE_PLAIN)
    const names = result.units.map((u) => u.name)
    expect(names).toEqual([
      'Noble',
      'Mage',
      'Garde Maritime de Lothern',
      'Maîtres des Épées de Hoeth',
      'Char à Lions de Chrace',
    ])
  })

  it('extracts modelCount when present, null otherwise', () => {
    const result = parseOwbExport(SAMPLE_PLAIN)
    const counts = result.units.map((u) => u.modelCount)
    expect(counts).toEqual([null, null, 15, 8, null])
  })

  it('extracts unit points', () => {
    const result = parseOwbExport(SAMPLE_PLAIN)
    const points = result.units.map((u) => u.points)
    expect(points).toEqual([106, 80, 170, 118, 125])
  })

  it('extracts options for units that have them', () => {
    const result = parseOwbExport(SAMPLE_PLAIN)
    const noble = result.units.find((u) => u.name === 'Noble')
    expect(noble?.options).toContain('Épée de Hoeth')
    expect(noble?.options).toContain('Gardien de Saphery')
  })

  it('returns null specialRules (plain text format has none)', () => {
    const result = parseOwbExport(SAMPLE_PLAIN)
    result.units.forEach((u) => {
      expect(u.specialRules).toBeNull()
    })
  })

  it('extracts correct sub-profile count per unit', () => {
    const result = parseOwbExport(SAMPLE_PLAIN)
    const spCounts = result.units.map((u) => u.subProfiles.length)
    expect(spCounts).toEqual([1, 1, 2, 2, 3])
  })

  it('parses sub-profile stats correctly (Noble)', () => {
    const result = parseOwbExport(SAMPLE_PLAIN)
    const noble = result.units.find((u) => u.name === 'Noble')
    const sp = noble?.subProfiles[0]
    expect(sp?.label).toBe('Noble')
    expect(sp?.m).toBe('5')
    expect(sp?.cc).toBe('6')
    expect(sp?.f).toBe('4')
    expect(sp?.cd).toBe('9')
  })

  it('parses dash stats correctly (Char à Lions)', () => {
    const result = parseOwbExport(SAMPLE_PLAIN)
    const chariot = result.units.find((u) => u.name === 'Char à Lions de Chrace')
    const lionChariot = chariot?.subProfiles.find((sp) => sp.label === 'Lion Chariot')
    expect(lionChariot?.m).toBe('-')
    expect(lionChariot?.cc).toBe('-')
    expect(lionChariot?.f).toBe('5')
  })
})
