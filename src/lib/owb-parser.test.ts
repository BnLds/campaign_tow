// src/lib/owb-parser.test.ts
// Story 2.1: OWB Army Import & Player Assignment
// Status: RED — written before implementation (ATDD)
//
// Verifies: AC1 (parsing structure), AC2 (parse completeness), AC4 (error cases)
// Will fail with "Cannot find module './owb-parser'" until owb-parser.ts is implemented.

import { describe, it, expect } from 'vitest'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseOwbExport } from './owb-parser'

// ---------------------------------------------------------------------------
// Sample OWB export loaded from fixture file (canonical source: docs/army_example.txt)
// Fixture created per Task 2.2 — single source of truth for parsing tests.
// ---------------------------------------------------------------------------

const SAMPLE_OWB = readFileSync(resolve(__dirname, '__fixtures__/owb-sample.txt'), 'utf-8')

// ---------------------------------------------------------------------------
// AC1 — Army header: name, faction, totalPoints
// ---------------------------------------------------------------------------

describe('[AC1][P0] parseOwbExport — army header', () => {
  it('[2.1-UNIT-001] parses army name from "## {Name} [{pts} pts]" header line', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    expect(result.name).toBe('Zboooiiiiing')
  })

  it('[2.1-UNIT-002] parses faction from second line after "Warhammer: The Old World, {faction},"', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    expect(result.faction).toBe('Tribus des Orques & Gobelins')
  })

  it('[2.1-UNIT-003] parses totalPoints as integer from header brackets', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    expect(result.totalPoints).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// AC1 — Unit count and types
// ---------------------------------------------------------------------------

describe('[AC1][P0] parseOwbExport — unit count and type', () => {
  it('[2.1-UNIT-004] returns 4 units for the sample army (one per unit entry)', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    expect(result.units).toHaveLength(4)
  })

  it('[2.1-UNIT-005] assigns type "Personnages" to units under "### Personnages" section', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Chef de Guerre Gobelin de la Nuit')
    expect(unit?.type).toBe('Personnages')
  })

  it('[2.1-UNIT-006] assigns type "Unités de base" to units under that section header', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Troupeau de Squigs Gobelins de la Nuit')
    expect(unit?.type).toBe('Unités de base')
  })

  it('[2.1-UNIT-007] assigns type "Unités spéciales" to units under that section header', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Bande de Gobelins de la Nuit sur Squigs')
    expect(unit?.type).toBe('Unités spéciales')
  })

  it('[2.1-UNIT-008] assigns type "Unités rares" to units under that section header', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Squigs Broyeurs')
    expect(unit?.type).toBe('Unités rares')
  })
})

// ---------------------------------------------------------------------------
// AC1 — modelCount: optional count prefix on unit line
// ---------------------------------------------------------------------------

describe('[AC1][P0] parseOwbExport — modelCount', () => {
  it('[2.1-UNIT-009] extracts modelCount from numeric prefix (15 Troupeau… → modelCount: 15)', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Troupeau de Squigs Gobelins de la Nuit')
    expect(unit?.modelCount).toBe(15)
  })

  it('[2.1-UNIT-010] returns modelCount: null for single-model units without a count prefix', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Chef de Guerre Gobelin de la Nuit')
    expect(unit?.modelCount).toBeNull()
  })

  it('[2.1-UNIT-011] returns modelCount: null for "Squigs Broyeurs" (no count prefix)', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Squigs Broyeurs')
    expect(unit?.modelCount).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// AC1 — Sub-profiles: count and label extraction
// ---------------------------------------------------------------------------

describe('[AC1][P0] parseOwbExport — sub-profiles', () => {
  it('[2.1-UNIT-012] extracts 2 sub-profiles for "Chef de Guerre" (Night Goblin Warboss + Giant Cave Squig)', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Chef de Guerre Gobelin de la Nuit')
    expect(unit?.subProfiles).toHaveLength(2)
  })

  it('[2.1-UNIT-013] first sub-profile label is "Night Goblin Warboss" (extracted from [brackets])', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Chef de Guerre Gobelin de la Nuit')
    const sp0 = unit?.subProfiles[0]
    assert(sp0 !== undefined, 'subProfiles[0] must exist')
    expect(sp0.label).toBe('Night Goblin Warboss')
  })

  it('[2.1-UNIT-014] second sub-profile label is "Giant Cave Squig"', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Chef de Guerre Gobelin de la Nuit')
    const sp1 = unit?.subProfiles[1]
    assert(sp1 !== undefined, 'subProfiles[1] must exist')
    expect(sp1.label).toBe('Giant Cave Squig')
  })

  it('[2.1-UNIT-015] extracts 3 sub-profiles for "Bande de Gobelins de la Nuit sur Squigs"', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Bande de Gobelins de la Nuit sur Squigs')
    expect(unit?.subProfiles).toHaveLength(3)
  })

  it('[2.1-UNIT-016] trims leading/trailing spaces from sub-profile labels ([ Bounder Squig] → "Bounder Squig")', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Bande de Gobelins de la Nuit sur Squigs')
    const bounder = unit?.subProfiles.find((sp) => sp.label.includes('Bounder Squig'))
    expect(bounder?.label).toBe('Bounder Squig')
  })
})

// ---------------------------------------------------------------------------
// AC1 — Stats: stored as text, not numbers
// Task 9.2: handles dice expressions in stats (3D6, D6)
// Task 9.3: handles special stat values ((-), (+1), (0), -)
// ---------------------------------------------------------------------------

describe('[AC1][P0] parseOwbExport — stat values stored as text', () => {
  it('[2.1-UNIT-017] parses regular numeric stat as string ("4" not 4)', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Chef de Guerre Gobelin de la Nuit')
    const warboss = unit?.subProfiles[0]
    expect(warboss?.m).toBe('4')
  })

  it('[2.1-UNIT-018] handles dice expression: M(3D6) → "3D6" (string, not parsed)', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Chef de Guerre Gobelin de la Nuit')
    const squig = unit?.subProfiles[1]
    expect(squig?.m).toBe('3D6')
  })

  it('[2.1-UNIT-019] handles dash stat: CT(-) → "-"', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Chef de Guerre Gobelin de la Nuit')
    const squig = unit?.subProfiles[1]
    expect(squig?.ct).toBe('-')
  })

  it('[2.1-UNIT-020] handles parenthesized modifier: PV((+1)) → "(+1)"', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Chef de Guerre Gobelin de la Nuit')
    const squig = unit?.subProfiles[1]
    expect(squig?.pv).toBe('(+1)')
  })

  it('[2.1-UNIT-021] handles zero stat: CT(0) → "0"', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Squigs Broyeurs')
    const mangler = unit?.subProfiles[0]
    expect(mangler?.ct).toBe('0')
  })

  it('[2.1-UNIT-022] handles D6 dice expression: A(D6) → "D6"', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Squigs Broyeurs')
    const mangler = unit?.subProfiles[0]
    expect(mangler?.a).toBe('D6')
  })
})

// ---------------------------------------------------------------------------
// AC1 — Special rules and equipment/options (Task 9.7, 9.8)
// ---------------------------------------------------------------------------

describe('[AC1][P0] parseOwbExport — special rules and options', () => {
  it('[2.1-UNIT-023] extracts special rules as comma-separated string from __Règles spéciales:__ line', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Chef de Guerre Gobelin de la Nuit')
    expect(unit?.specialRules).toContain('Haine (Nains)')
  })

  it('[2.1-UNIT-024] extracts options/equipment from -# line', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Chef de Guerre Gobelin de la Nuit')
    expect(unit?.options).toContain('Armure légère')
  })

  it('[2.1-UNIT-025] returns null specialRules when no Règles spéciales line present', () => {
    // Minimal OWB with no special rules line
    const minimalOwb = `## Test Army [50 pts]
Warhammer: The Old World, Empire, Colonne de Bataille

### Unités de base [50 pts]
- 10 Guerriers [50 pts]
 - [Warrior] M(4) CC(3) CT(3) F(3) E(4) PV(1) I(3) A(1) Cd(7)

*Créé avec "Old World Builder"* - https://old-world-builder.com`
    const result = parseOwbExport(minimalOwb)
    const unit025 = result.units[0]
    assert(unit025 !== undefined, 'units[0] must exist')
    expect(unit025.specialRules).toBeNull()
  })

  it('[2.1-UNIT-026] returns null options when no -# line present', () => {
    const minimalOwb = `## Test Army [50 pts]
Warhammer: The Old World, Empire, Colonne de Bataille

### Unités de base [50 pts]
- 10 Guerriers [50 pts]
 - [Warrior] M(4) CC(3) CT(3) F(3) E(4) PV(1) I(3) A(1) Cd(7)

*Créé avec "Old World Builder"* - https://old-world-builder.com`
    const result = parseOwbExport(minimalOwb)
    const unit026 = result.units[0]
    assert(unit026 !== undefined, 'units[0] must exist')
    expect(unit026.options).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// AC1 — Points per unit
// ---------------------------------------------------------------------------

describe('[AC1][P0] parseOwbExport — unit points', () => {
  it('[2.1-UNIT-027] parses points from unit line brackets (102 pts)', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Chef de Guerre Gobelin de la Nuit')
    expect(unit?.points).toBe(102)
  })

  it('[2.1-UNIT-028] parses points for multi-model unit (159 pts)', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    const unit = result.units.find((u) => u.name === 'Troupeau de Squigs Gobelins de la Nuit')
    expect(unit?.points).toBe(159)
  })
})

// ---------------------------------------------------------------------------
// AC1 — Footer ignored (Task 9.1 — no footer unit created)
// ---------------------------------------------------------------------------

describe('[AC1][P0] parseOwbExport — footer handling', () => {
  it('[2.1-UNIT-029] ignores footer line "*Créé avec Old World Builder*" — not treated as a unit', () => {
    const result = parseOwbExport(SAMPLE_OWB)
    // Footer must not produce a unit — sample has exactly 4 units
    expect(result.units).toHaveLength(4)
  })
})

// ---------------------------------------------------------------------------
// English section headers — normalized to French canonical types
// ---------------------------------------------------------------------------

describe('parseOwbExport — English section headers normalized to French', () => {
  const ENGLISH_OWB_BLOCKTEXT = `===
Freakshow [788 pts]
Warhammer: The Old World, Warriors of Chaos, Battle March
===

++ Characters [205 pts] ++

Exalted Sorcerer [125 pts]
Hand weapon

[Exalted Sorcerer] M(4) WS(4) BS(3) S(4) T(4) W(2) I(3) A(2) Ld(8)

Aspiring Champion [80 pts]
Hand weapon

[Aspiring Champion] M(4) WS(5) BS(3) S(4) T(4) W(2) I(4) A(3) Ld(8)

++ Core Units [345 pts] ++

16 Chaos Marauders [128 pts]
Hand weapons

[Chaos Marauder] M(4) WS(4) BS(3) S(3) T(3) W(1) I(3) A(1) Ld(6)

++ Special Units [238 pts] ++

2 Dragon Ogres [132 pts]
Great weapons

[Dragon Ogre] M(7) WS(4) BS(2) S(5) T(4) W(4) I(2) A(3) Ld(8)

---
Created with "Old World Builder"
`

  it('normalizes "Characters" → "Personnages"', () => {
    const result = parseOwbExport(ENGLISH_OWB_BLOCKTEXT)
    const unit = result.units.find((u) => u.name === 'Exalted Sorcerer')
    expect(unit?.type).toBe('Personnages')
  })

  it('normalizes "Core Units" → "Unités de base"', () => {
    const result = parseOwbExport(ENGLISH_OWB_BLOCKTEXT)
    const unit = result.units.find((u) => u.name === 'Chaos Marauders')
    expect(unit?.type).toBe('Unités de base')
  })

  it('normalizes "Special Units" → "Unités spéciales"', () => {
    const result = parseOwbExport(ENGLISH_OWB_BLOCKTEXT)
    const unit = result.units.find((u) => u.name === 'Dragon Ogres')
    expect(unit?.type).toBe('Unités spéciales')
  })
})

// ---------------------------------------------------------------------------
// AC4 — Error cases (Task 9.6)
// ---------------------------------------------------------------------------

describe('[AC4][P0] parseOwbExport — error handling', () => {
  it('[2.1-UNIT-030] throws a descriptive error on empty input', () => {
    expect(() => parseOwbExport('')).toThrow()
  })

  it('[2.1-UNIT-031] throws a descriptive error when input is not OWB format (no ## header)', () => {
    expect(() => parseOwbExport('This is not an OWB export')).toThrow()
  })

  it('[2.1-UNIT-032] error message is a non-empty string (descriptive, not just "Error")', () => {
    let errorMessage = ''
    try {
      parseOwbExport('')
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e)
    }
    expect(errorMessage.length).toBeGreaterThan(0)
  })
})
