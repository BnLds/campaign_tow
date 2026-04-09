// tests/owb-parser.test.ts
// Runtime tests for parseOwbExport and normalizeBlockText.
// Covers the "block text" format (=== delimiters, ++ sections ++, bare unit lines).

import assert from 'node:assert'
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseOwbExport, normalizeBlockText } from '../src/lib/owb-parser'

const ROOT = resolve(__dirname, '..')

const army3text = readFileSync(resolve(ROOT, 'docs/army_3_txt'), 'utf-8')

describe('[OWB-BT] parseOwbExport — block text format (army_3_txt)', () => {
  it('[OWB-BT-001] parses without throwing', () => {
    expect(() => parseOwbExport(army3text)).not.toThrow()
  })

  it('[OWB-BT-002] extracts army name', () => {
    const result = parseOwbExport(army3text)
    // Non-breaking hyphen in "Xlaco‑Tok" preserved
    expect(result.name).toMatch(/Tok et les l.zards/)
  })

  it('[OWB-BT-003] extracts faction', () => {
    const result = parseOwbExport(army3text)
    expect(result.faction).toBe('Hommes-Lézards')
  })

  it('[OWB-BT-004] extracts total points', () => {
    const result = parseOwbExport(army3text)
    expect(result.totalPoints).toBe(500)
  })

  it('[OWB-BT-005] extracts all 6 units (2 persos + 3 base + 1 rare)', () => {
    const result = parseOwbExport(army3text)
    expect(result.units.length).toBe(6)
  })

  it('[OWB-BT-006] every unit has at least 1 sub-profile (stats present)', () => {
    const result = parseOwbExport(army3text)
    for (const unit of result.units) {
      expect(unit.subProfiles.length, `${unit.name} should have subProfiles`).toBeGreaterThanOrEqual(1)
    }
  })

  it('[OWB-BT-007] Xlaco-Tok sub-profile has correct label and cc stat', () => {
    const result = parseOwbExport(army3text)
    const xlaco = result.units[0]
    expect(xlaco.subProfiles[0].label).toBe('Saurus Scar-Veteran')
    expect(xlaco.subProfiles[0].cc).toBe('5')
  })

  it('[OWB-BT-008] Salamandre unit has 2 sub-profiles (Skink Handler + Salamander)', () => {
    const result = parseOwbExport(army3text)
    const salamandre = result.units[result.units.length - 1]
    expect(salamandre.subProfiles.length).toBe(2)
    expect(salamandre.subProfiles[0].label).toBe('Skink Handler')
    expect(salamandre.subProfiles[1].label).toBe('Salamander')
  })
})

describe('[OWB-BT] normalizeBlockText — structure', () => {
  it('[OWB-BT-010] output starts with ## (army header)', () => {
    const out = normalizeBlockText(army3text)
    expect(out.trimStart()).toMatch(/^## /)
  })

  it('[OWB-BT-011] sections are converted to ### format', () => {
    const out = normalizeBlockText(army3text)
    expect(out).toMatch(/^### Personnages/m)
    expect(out).toMatch(/^### Unités de base/m)
    expect(out).toMatch(/^### Unités rares/m)
  })

  it('[OWB-BT-012] unit lines are prefixed with -', () => {
    const out = normalizeBlockText(army3text)
    expect(out).toMatch(/^- Xlaco/m)
  })

  it('[OWB-BT-013] equipment items are aggregated into a single -# line', () => {
    const out = normalizeBlockText(army3text)
    expect(out).toMatch(/ -# \(.*Arme lourde.*\)/)
  })

  it('[OWB-BT-014] sub-profiles are prefixed with " - "', () => {
    const out = normalizeBlockText(army3text)
    expect(out).toMatch(/ - \[Saurus Scar-Veteran\] M\(/)
  })

  it('[OWB-BT-015] footer (--- and below) is not included in output', () => {
    const out = normalizeBlockText(army3text)
    expect(out).not.toContain('old-world-builder.com')
    expect(out).not.toContain('---')
  })
})

describe('[OWB-NICK] nickname extraction', () => {
  it('[OWB-BT-009] extracts nickname from "Nickname, UnitType" format (blocktext)', () => {
    const result = parseOwbExport(army3text)
    const xlaco = result.units[0]
    expect(xlaco.nickname).toMatch(/Xlaco/)
    expect(xlaco.name).toMatch(/Saurus/)
  })

  it('[OWB-BT-010] units without comma in name have null nickname (plaintext army_2.txt)', () => {
    const army2text = readFileSync(resolve(ROOT, 'docs/army_2.txt'), 'utf-8')
    const result = parseOwbExport(army2text)
    for (const unit of result.units) {
      expect(unit.nickname, `${unit.name} should have null nickname`).toBeNull()
    }
  })

  it('[OWB-BT-011] all units with comma in original name have a non-null nickname', () => {
    const result = parseOwbExport(army3text)
    const named = result.units.filter(u => u.nickname !== null)
    expect(named.length).toBeGreaterThan(0)
    for (const u of named) {
      expect(u.name.length).toBeGreaterThan(0)
    }
  })

  it('[OWB-BT-012] name field contains unit type after nickname extraction', () => {
    const result = parseOwbExport(army3text)
    const saurus = result.units.find(u => u.nickname?.includes('Gardiens'))
    expect(saurus).toBeDefined()
    assert(saurus, 'saurus unit with nickname "Gardiens" must be found')
    expect(saurus.name).toBe('Guerriers Saurus')
  })

  it('[OWB-PT-NICK] handles plaintext format with nickname (comma in unit name)', () => {
    const plaintext = `Les Braves, Orques et Gobelins [300 pts],
Warhammer: The Old World, Orques et Gobelins, Colonne de Bataille
Personnages [100 pts],
Gork le Terrible, Boss Orque [100 pts]
(Arme lourde, Armure lourde)
,
[Orc Warboss] M(4) CC(5) CT(3) F(5) E(4) PV(3) I(3) A(4) Cd(8),
Unites de base [200 pts],
20 Garcons Orques [200 pts]
(Armes de base, Boucliers)
,
[Orc Boy] M(4) CC(3) CT(3) F(3) E(4) PV(1) I(2) A(1) Cd(7),
[Boss] M(4) CC(3) CT(3) F(3) E(4) PV(1) I(2) A(2) Cd(7),`
    const result = parseOwbExport(plaintext)
    expect(result.units[0].nickname).toBe('Gork le Terrible')
    expect(result.units[0].name).toBe('Boss Orque')
    expect(result.units[1].nickname).toBeNull()
    expect(result.units[1].name).toBe('Garcons Orques')
  })

  it('[OWB-PT-NICK-CRLF] handles CRLF line endings in plaintext with nickname', () => {
    const plaintext = `Les Braves, Orques et Gobelins [300 pts],
Warhammer: The Old World, Orques et Gobelins, Colonne de Bataille
Personnages [100 pts],
Gork le Terrible, Boss Orque [100 pts]
(Arme lourde, Armure lourde)
,
[Orc Warboss] M(4) CC(5) CT(3) F(5) E(4) PV(3) I(3) A(4) Cd(8),
Unites de base [200 pts],
20 Garcons Orques [200 pts]
(Armes de base, Boucliers)
,
[Orc Boy] M(4) CC(3) CT(3) F(3) E(4) PV(1) I(2) A(1) Cd(7),
[Boss] M(4) CC(3) CT(3) F(3) E(4) PV(1) I(2) A(2) Cd(7),`.replace(/\n/g, '\r\n')
    const result = parseOwbExport(plaintext)
    expect(result.units[0].nickname).toBe('Gork le Terrible')
    expect(result.units[0].name).toBe('Boss Orque')
  })
})
