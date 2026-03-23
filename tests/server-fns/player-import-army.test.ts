// tests/server-fns/player-import-army.test.ts
// Story 3.x — Self-Service Army Import for Players
//
// Static file-contract tests for playerImportArmyFn and ArmyImportForm.
// Follow the pattern established in tests/server-fns/submit-match-result.test.ts.
//
// Tests cover:
//   1. Guest guard → UNAUTHORIZED
//   2. Existing army guard → FORBIDDEN
//   3. Parse error → VALIDATION_ERROR (with parser message)
//   4. Empty army guard → VALIDATION_ERROR ("Aucune unite")
//   5. Happy path → success: true, data: { armyId, armyName, faction, unitCount }
//   6. Race condition (race lost) → calls deleteArmy, returns CONFLICT
//   7. Create/assign failure → attempts cleanup via deleteArmy, returns SERVER_ERROR
//   8. Component renders textarea + submit button
//   9. Campaign view — renders ArmyImportForm when army === null (not guest)
//  10. Armies view — renders ArmyImportForm when player has no own army

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')

function getServerFn() {
  return readFileSync(resolve(root, 'src/lib/server-fns/player-import-army.ts'), 'utf-8')
}

function getComponent() {
  return readFileSync(resolve(root, 'src/components/army-import-form.tsx'), 'utf-8')
}

function getCampaignRoute() {
  return readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
}

function getArmiesRoute() {
  return readFileSync(resolve(root, 'src/routes/armies/index.tsx'), 'utf-8')
}

function getArmiesQueries() {
  return readFileSync(resolve(root, 'src/db/queries/armies.ts'), 'utf-8')
}

// ---------------------------------------------------------------------------
// Server function structure
// ---------------------------------------------------------------------------

describe('[P0] playerImportArmyFn — declaration and middleware', () => {
  it('[PAI-001] playerImportArmyFn is exported and assigned to createServerFn({ method: "POST" })', () => {
    const code = getServerFn()
    expect(code).toMatch(/export\s+const\s+playerImportArmyFn\s*=\s*createServerFn/)
  })

  it('[PAI-002] playerImportArmyFn uses authMiddleware', () => {
    const code = getServerFn()
    expect(code).toMatch(/playerImportArmyFn\s*=\s*createServerFn[\s\S]{0,300}\.middleware\(\[authMiddleware\]\)/)
  })

  it('[PAI-003] playerImportArmyFn uses inputValidator with importArmySchema', () => {
    const code = getServerFn()
    expect(code).toMatch(/\.inputValidator\(importArmySchema\)/)
  })

  it('[PAI-004] playerImportArmyFn return type is ServerResult<{...}>', () => {
    const code = getServerFn()
    expect(code).toMatch(/ServerResult<\{[\s\S]{0,200}armyId[\s\S]{0,200}armyName[\s\S]{0,200}\}>/)
  })
})

// ---------------------------------------------------------------------------
// Guard 1: Guest → UNAUTHORIZED
// ---------------------------------------------------------------------------

describe('[AC8][P0] playerImportArmyFn — guest guard', () => {
  it('[PAI-010] checks context.session.isGuest', () => {
    const code = getServerFn()
    expect(code).toMatch(/context\.session\.isGuest/)
  })

  it('[PAI-011] returns UNAUTHORIZED for guests', () => {
    const code = getServerFn()
    expect(code).toMatch(/isGuest[\s\S]{0,300}UNAUTHORIZED/)
  })

  it('[PAI-012] returns French message "Connexion requise" for guests', () => {
    const code = getServerFn()
    expect(code).toMatch(/Connexion requise/)
  })
})

// ---------------------------------------------------------------------------
// Guard 2: Existing army → FORBIDDEN
// ---------------------------------------------------------------------------

describe('[AC9][P0] playerImportArmyFn — existing army guard', () => {
  it('[PAI-020] calls getPlayerArmy via dynamic import', () => {
    const code = getServerFn()
    expect(code).toMatch(/getPlayerArmy[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[PAI-021] returns FORBIDDEN when player already has an army', () => {
    const code = getServerFn()
    expect(code).toMatch(/existingArmy[\s\S]{0,300}FORBIDDEN/)
  })

  it('[PAI-022] returns French message "Vous avez deja une armee" for existing army', () => {
    const code = getServerFn()
    expect(code).toMatch(/Vous avez deja une armee/)
  })
})

// ---------------------------------------------------------------------------
// Guard 3: Parse error → VALIDATION_ERROR
// ---------------------------------------------------------------------------

describe('[AC6][P0] playerImportArmyFn — parse error handling', () => {
  it('[PAI-030] calls parseOwbExport inside try/catch', () => {
    const code = getServerFn()
    expect(code).toMatch(/parseOwbExport[\s\S]{0,300}catch/)
  })

  it('[PAI-031] returns VALIDATION_ERROR on parse failure with parser message', () => {
    const code = getServerFn()
    expect(code).toMatch(/VALIDATION_ERROR[\s\S]{0,300}err\.message|err\.message[\s\S]{0,300}VALIDATION_ERROR/)
  })
})

// ---------------------------------------------------------------------------
// Guard 4: Empty units → VALIDATION_ERROR
// ---------------------------------------------------------------------------

describe('[P0] playerImportArmyFn — empty units guard', () => {
  it('[PAI-040] checks that parsed.units.length is not 0', () => {
    const code = getServerFn()
    expect(code).toMatch(/parsed\.units\.length/)
  })

  it('[PAI-041] returns VALIDATION_ERROR with "Aucune unite" message', () => {
    const code = getServerFn()
    expect(code).toMatch(/Aucune unite/)
  })
})

// ---------------------------------------------------------------------------
// Guard 5: Missing stats → VALIDATION_ERROR with OWB hint
// ---------------------------------------------------------------------------

describe('[P0] parseOwbExport — missing stats guard', () => {
  it('[PAI-042] throws when all units have empty subProfiles (stats not exported)', () => {
    const parser = readFileSync(resolve(root, 'src/lib/owb-parser.ts'), 'utf-8')
    expect(parser).toMatch(/subProfiles\.length[\s\S]{0,200}Afficher les caract/)
  })

  it('[PAI-043] error message mentions "Afficher les caractéristiques"', () => {
    const parser = readFileSync(resolve(root, 'src/lib/owb-parser.ts'), 'utf-8')
    expect(parser).toMatch(/Afficher les caract/)
  })
})

// ---------------------------------------------------------------------------
// Happy path → success
// ---------------------------------------------------------------------------

describe('[AC5][P0] playerImportArmyFn — happy path', () => {
  it('[PAI-050] calls createArmyWithUnits via dynamic import', () => {
    const code = getServerFn()
    expect(code).toMatch(/createArmyWithUnits[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[PAI-051] calls assignArmyToPlayer via dynamic import', () => {
    const code = getServerFn()
    expect(code).toMatch(/assignArmyToPlayer[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[PAI-052] returns { success: true, data: { armyId, armyName, faction, unitCount } }', () => {
    const code = getServerFn()
    expect(code).toMatch(/success:\s*true[\s\S]{0,300}armyId[\s\S]{0,300}armyName[\s\S]{0,300}faction[\s\S]{0,300}unitCount/)
  })

  it('[PAI-053] faction comes from parsed (not createArmyWithUnits)', () => {
    const code = getServerFn()
    expect(code).toMatch(/faction:\s*parsed\.faction/)
  })
})

// ---------------------------------------------------------------------------
// Race condition: re-check after assign → CONFLICT
// ---------------------------------------------------------------------------

describe('[AC7][P0] playerImportArmyFn — race condition check', () => {
  it('[PAI-060] re-calls getPlayerArmy after assignArmyToPlayer to verify ownership', () => {
    const code = getServerFn()
    // Must have at least two references to getPlayerArmy (pre-guard + post-assign)
    const matches = code.match(/getPlayerArmy/g)
    expect(matches).not.toBeNull()
    expect((matches ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('[PAI-061] calls deleteArmy when race is lost', () => {
    const code = getServerFn()
    expect(code).toMatch(/deleteArmy/)
  })

  it('[PAI-062] returns CONFLICT when race is lost', () => {
    const code = getServerFn()
    expect(code).toMatch(/CONFLICT/)
  })
})

// ---------------------------------------------------------------------------
// Create/assign failure → SERVER_ERROR + cleanup
// ---------------------------------------------------------------------------

describe('[P0] playerImportArmyFn — failure cleanup', () => {
  it('[PAI-070] attempts deleteArmy cleanup on unexpected error', () => {
    const code = getServerFn()
    // deleteArmy called in catch block
    expect(code).toMatch(/catch[\s\S]{0,300}deleteArmy|deleteArmy[\s\S]{0,300}catch/)
  })

  it('[PAI-071] returns SERVER_ERROR on unexpected failure', () => {
    const code = getServerFn()
    expect(code).toMatch(/SERVER_ERROR/)
  })
})

// ---------------------------------------------------------------------------
// deleteArmy query
// ---------------------------------------------------------------------------

describe('[P0] deleteArmy — DB query', () => {
  it('[PAI-080] deleteArmy is exported from armies queries', () => {
    const code = getArmiesQueries()
    expect(code).toMatch(/export\s+async\s+function\s+deleteArmy/)
  })

  it('[PAI-081] deleteArmy deletes by armyId', () => {
    const code = getArmiesQueries()
    expect(code).toMatch(/deleteArmy[\s\S]{0,200}armies[\s\S]{0,100}armyId/)
  })
})

// ---------------------------------------------------------------------------
// ArmyImportForm component
// ---------------------------------------------------------------------------

describe('[AC1][AC2][P0] ArmyImportForm — component structure', () => {
  it('[PAI-090] exports ArmyImportForm function', () => {
    const code = getComponent()
    expect(code).toMatch(/export\s+function\s+ArmyImportForm/)
  })

  it('[PAI-091] renders textarea with data-testid="player-owb-import-textarea"', () => {
    const code = getComponent()
    expect(code).toMatch(/data-testid="player-owb-import-textarea"/)
  })

  it('[PAI-092] renders submit button with data-testid="player-owb-import-submit"', () => {
    const code = getComponent()
    expect(code).toMatch(/data-testid="player-owb-import-submit"/)
  })

  it('[PAI-093] button is disabled when text is empty or submitting', () => {
    const code = getComponent()
    expect(code).toMatch(/disabled=\{[\s\S]{0,100}submitting[\s\S]{0,100}trimmed|disabled=\{[\s\S]{0,100}trimmed[\s\S]{0,100}submitting/)
  })

  it('[PAI-094] calls playerImportArmyFn on submit', () => {
    const code = getComponent()
    expect(code).toMatch(/playerImportArmyFn/)
  })

  it('[PAI-095] calls onSuccess callback on successful import', () => {
    const code = getComponent()
    expect(code).toMatch(/onSuccess/)
  })

  it('[PAI-096] shows success result with bonus colors', () => {
    const code = getComponent()
    expect(code).toMatch(/color-bonus/)
  })

  it('[PAI-097] shows error result with malus colors', () => {
    const code = getComponent()
    expect(code).toMatch(/color-malus/)
  })
})

// ---------------------------------------------------------------------------
// Campaign view integration
// ---------------------------------------------------------------------------

describe('[AC1][AC3][AC4][P0] Campaign view — ArmyImportForm integration', () => {
  it('[PAI-100] imports ArmyImportForm', () => {
    const code = getCampaignRoute()
    expect(code).toMatch(/import.*ArmyImportForm.*army-import-form/)
  })

  it('[PAI-101] renders ArmyImportForm when army === null', () => {
    const code = getCampaignRoute()
    expect(code).toMatch(/army === null[\s\S]{0,300}ArmyImportForm/)
  })

  it('[PAI-102] ArmyImportForm onSuccess calls router.invalidate()', () => {
    const code = getCampaignRoute()
    expect(code).toMatch(/ArmyImportForm[\s\S]{0,500}router\.invalidate/)
  })
})

// ---------------------------------------------------------------------------
// Armies list view integration
// ---------------------------------------------------------------------------

describe('[AC2][AC3][AC4][P0] Armies view — ArmyImportForm integration', () => {
  it('[PAI-110] imports ArmyImportForm', () => {
    const code = getArmiesRoute()
    expect(code).toMatch(/import.*ArmyImportForm.*army-import-form/)
  })

  it('[PAI-111] renders ArmyImportForm only when not guest and no own army', () => {
    const code = getArmiesRoute()
    expect(code).toMatch(/!isGuest[\s\S]{0,300}ArmyImportForm|ArmyImportForm[\s\S]{0,300}!isGuest/)
  })

  it('[PAI-112] detects own army via isOwn flag', () => {
    const code = getArmiesRoute()
    expect(code).toMatch(/isOwn/)
  })

  it('[PAI-113] ArmyImportForm onSuccess calls router.invalidate()', () => {
    const code = getArmiesRoute()
    expect(code).toMatch(/ArmyImportForm[\s\S]{0,500}router\.invalidate/)
  })
})
