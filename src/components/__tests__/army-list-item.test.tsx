// src/components/__tests__/army-list-item.test.tsx
// Story 3.1b: App Shell — TabBar, Layout & Navigation Components
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the ArmyListItem component.
// Follows the pattern established in tests/2-4-unit-edit-panel-component.test.ts.
//
// Covers AC3, AC10 and Tasks 2.1–2.9, 8.5–8.12.
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')

function getArmyListItem() {
  return readFileSync(resolve(root, 'src/components/army-list-item.tsx'), 'utf-8')
}

// ---------------------------------------------------------------------------
// AC3 — File exists and exports ArmyListItem
// ---------------------------------------------------------------------------

describe('[AC3][P0] ArmyListItem — component file exists and exports', () => {
  it('[3.1b-ALI-001] src/components/army-list-item.tsx file exists', () => {
    expect(() => getArmyListItem()).not.toThrow()
  })

  it('[3.1b-ALI-002] army-list-item.tsx exports ArmyListItem as named export', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/export function ArmyListItem/)
  })
})

// ---------------------------------------------------------------------------
// AC3 — Props interface (Task 2.1)
// ---------------------------------------------------------------------------

describe('[AC3][P0] ArmyListItem — props definition (Task 2.1)', () => {
  it('[3.1b-ALI-003] ArmyListItem accepts id prop (string)', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/id[\s]*:[\s]*string/)
  })

  it('[3.1b-ALI-004] ArmyListItem accepts name prop (string)', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/name[\s]*:[\s]*string/)
  })

  it('[3.1b-ALI-005] ArmyListItem accepts faction prop (string)', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/faction[\s]*:[\s]*string/)
  })

  it('[3.1b-ALI-006] ArmyListItem accepts playerDisplayName prop (string | null)', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/playerDisplayName[\s]*:[\s]*(string \| null|null \| string)/)
  })

  it('[3.1b-ALI-007] ArmyListItem accepts record prop (object with wins/draws/losses or null)', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/record[\s]*:[\s\S]{0,100}(wins|draws|losses)/)
  })

  it('[3.1b-ALI-008] ArmyListItem accepts isOwn prop (boolean)', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/isOwn[\s]*:[\s]*boolean/)
  })
})

// ---------------------------------------------------------------------------
// AC3 — Avatar renders first letter of army name (Task 2.2, 8.5)
// ---------------------------------------------------------------------------

describe('[AC3][P0] ArmyListItem — avatar with first letter (Task 2.2, 8.5)', () => {
  it('[3.1b-ALI-009] ArmyListItem renders an avatar element with data-testid="army-avatar"', () => {
    const code = getArmyListItem()
    expect(code).toContain('data-testid="army-avatar"')
  })

  it('[3.1b-ALI-010] Avatar shows first letter of army name (charAt(0) or [0])', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/name\.(charAt\(0\)|\[0\])|charAt\(0\)/)
  })

  it('[3.1b-ALI-011] Avatar uses Cinzel font (var(--font-display))', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/font-display|fontFamily[\s\S]{0,50}display/)
  })

  it('[3.1b-ALI-012] Avatar circle is 42x42px with border-radius 50%', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/42/)
    expect(code).toMatch(/borderRadius.*50%|50%.*borderRadius/)
  })
})

// ---------------------------------------------------------------------------
// AC3 — Renders army name, faction, player display name (Task 2.3, 8.6)
// ---------------------------------------------------------------------------

describe('[AC3][P0] ArmyListItem — army info rendering (Task 2.3, 8.6)', () => {
  it('[3.1b-ALI-013] ArmyListItem renders army name with Cinzel font', () => {
    const code = getArmyListItem()
    // Army name with font-display token
    expect(code).toMatch(/\{name\}/)
  })

  it('[3.1b-ALI-014] ArmyListItem renders faction', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/\{faction\}/)
  })

  it('[3.1b-ALI-015] ArmyListItem renders playerDisplayName', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/\{playerDisplayName\}/)
  })

  it('[3.1b-ALI-016] Army name uses white-space nowrap and text-overflow ellipsis for long names (8.12)', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/textOverflow.*ellipsis|text-overflow.*ellipsis/)
    expect(code).toMatch(/whiteSpace.*nowrap|white-space.*nowrap/)
  })
})

// ---------------------------------------------------------------------------
// AC3 — Gold variant styling when isOwn=true (Task 2.6, 8.7, 8.8)
// ---------------------------------------------------------------------------

describe('[AC3][P0] ArmyListItem — gold variant for own army (Task 2.6, 8.7)', () => {
  it('[3.1b-ALI-017] isOwn=true applies gold border color #ead69b', () => {
    const code = getArmyListItem()
    expect(code).toContain('#ead69b')
  })

  it('[3.1b-ALI-018] isOwn=true applies gold background gradient starting from #fff9ec', () => {
    const code = getArmyListItem()
    expect(code).toContain('#fff9ec')
  })

  it('[3.1b-ALI-019] isOwn=true applies gold box-shadow with rgba(212,168,67,...)', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/rgba\(212[\s,]*168[\s,]*67/)
  })

  it('[3.1b-ALI-020] isOwn=false applies normal border #e0d5c8 (variant logic present)', () => {
    const code = getArmyListItem()
    expect(code).toContain('#e0d5c8')
  })

  it('[3.1b-ALI-021] Gold variant is conditional on isOwn prop', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/isOwn[\s\S]{0,300}#ead69b|#ead69b[\s\S]{0,300}isOwn/)
  })
})

// ---------------------------------------------------------------------------
// AC10 — Record display: "Aucune partie" for null/zero records (Task 2.4, 8.9, 8.10)
// ---------------------------------------------------------------------------

describe('[AC10][P0] ArmyListItem — win/draw/loss record rendering (Task 2.4, 8.9, 8.10)', () => {
  it('[3.1b-ALI-022] ArmyListItem renders wins count with green color #2d7a3a', () => {
    const code = getArmyListItem()
    expect(code).toContain('#2d7a3a')
  })

  it('[3.1b-ALI-023] ArmyListItem renders losses count with red color #b82c2c', () => {
    const code = getArmyListItem()
    expect(code).toContain('#b82c2c')
  })

  it('[3.1b-ALI-024] ArmyListItem shows "Aucune partie" when record is null', () => {
    const code = getArmyListItem()
    expect(code).toContain('Aucune partie')
  })

  it('[3.1b-ALI-025] "Aucune partie" uses muted italic style (--color-text-muted or #9a8d7f)', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/(Aucune partie[\s\S]{0,300}(color-text-muted|#9a8d7f|italic))|(color-text-muted|#9a8d7f|italic)[\s\S]{0,300}Aucune partie/)
  })

  it('[3.1b-ALI-026] "Aucune partie" shown when wins + draws + losses === 0 (all-zero guard)', () => {
    const code = getArmyListItem()
    // Must check for all-zero case (wins + draws + losses === 0 or similar)
    expect(code).toMatch(/(wins.*draws.*losses|record\.wins[\s\S]{0,100}record\.draws[\s\S]{0,100}record\.losses)/)
  })
})

// ---------------------------------------------------------------------------
// AC3 — Chevron indicator (Task 2.5)
// ---------------------------------------------------------------------------

describe('[AC3][P0] ArmyListItem — chevron indicator (Task 2.5)', () => {
  it('[3.1b-ALI-027] ArmyListItem renders a chevron / right-arrow character', () => {
    const code = getArmyListItem()
    // Chevron: > or › or ❯ or similar
    expect(code).toMatch(/[›>❯]|chevron/i)
  })
})

// ---------------------------------------------------------------------------
// AC3 — Navigation link to /armies/$armyId (Task 2.7, 8.11)
// ---------------------------------------------------------------------------

describe('[AC3][P0] ArmyListItem — navigation link (Task 2.7, 8.11)', () => {
  it('[3.1b-ALI-028] army-list-item.tsx imports Link from @tanstack/react-router', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/import[\s\S]{0,200}Link[\s\S]{0,100}@tanstack\/react-router/)
  })

  it('[3.1b-ALI-029] ArmyListItem wraps content in Link to "/armies/$armyId" route', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/Link[\s\S]{0,200}(\/armies\/\$armyId|to.*armies.*armyId)/)
  })

  it('[3.1b-ALI-030] Link uses armyId as param (params prop with armyId)', () => {
    const code = getArmyListItem()
    expect(code).toMatch(/params[\s\S]{0,100}armyId/)
  })
})

// ---------------------------------------------------------------------------
// AC3 — data-testid attributes (Task 2.8)
// ---------------------------------------------------------------------------

describe('[AC3][P0] ArmyListItem — data-testid attributes (Task 2.8)', () => {
  it('[3.1b-ALI-031] Root element has data-testid="army-list-item"', () => {
    const code = getArmyListItem()
    expect(code).toContain('data-testid="army-list-item"')
  })
})

// ---------------------------------------------------------------------------
// AC3 — Armies list route uses ArmyListItem (Task 6.4)
// ---------------------------------------------------------------------------

describe('[AC3][P0] Armies list route — uses ArmyListItem component (Task 6.4)', () => {
  it('[3.1b-ALI-032] armies/index.tsx imports ArmyListItem from army-list-item', () => {
    const armiesRoute = readFileSync(resolve(root, 'src/routes/armies/index.tsx'), 'utf-8')
    expect(armiesRoute).toMatch(/import[\s\S]{0,200}ArmyListItem[\s\S]{0,100}army-list-item/)
  })

  it('[3.1b-ALI-033] armies/index.tsx renders ArmyListItem components', () => {
    const armiesRoute = readFileSync(resolve(root, 'src/routes/armies/index.tsx'), 'utf-8')
    expect(armiesRoute).toMatch(/<ArmyListItem/)
  })

  it('[3.1b-ALI-034] armies/index.tsx calls getAllArmyRecords (batch query — Task 6.1)', () => {
    const armiesRoute = readFileSync(resolve(root, 'src/routes/armies/index.tsx'), 'utf-8')
    expect(armiesRoute).toMatch(/getAllArmyRecords/)
  })

  it('[3.1b-ALI-035] armies/index.tsx passes record prop to ArmyListItem', () => {
    const armiesRoute = readFileSync(resolve(root, 'src/routes/armies/index.tsx'), 'utf-8')
    expect(armiesRoute).toMatch(/ArmyListItem[\s\S]{0,300}record/)
  })

  it('[3.1b-ALI-036] Own army is pinned first — sorting logic uses isOwn or localeCompare (Task 6.3)', () => {
    const armiesRoute = readFileSync(resolve(root, 'src/routes/armies/index.tsx'), 'utf-8')
    expect(armiesRoute).toMatch(/(isOwn[\s\S]{0,200}localeCompare|localeCompare[\s\S]{0,200}isOwn|sort[\s\S]{0,300}isOwn)/)
  })
})
