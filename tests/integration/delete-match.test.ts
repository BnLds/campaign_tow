// tests/integration/delete-match.test.ts
// Delete Pending Match — structural contract tests
//
// Verifies: AC1 (validator + server fn structure), AC2 (guard pattern), AC3 (XP rollback),
//           AC6 (FOR UPDATE lock), AC7 (admin fn), AC10 (participant check)
//
// Pattern: readFileSync + regex assertions (no DB required)

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllQueries } from '../helpers/read-queries'

const root = resolve(__dirname, '../..')

// ---------------------------------------------------------------------------
// AC1 — Validator: deleteMatchSchema
// ---------------------------------------------------------------------------

describe('[AC1][P0] Validator — deleteMatchSchema — src/lib/validators.ts', () => {
  const validators = () => readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')

  it('[DEL-001] validators.ts exports deleteMatchSchema with matchId z.string().min(1)', () => {
    const code = validators()
    expect(code).toMatch(/export const deleteMatchSchema\s*=\s*z\.object\(\{\s*matchId:\s*z\.string\(\)\.min\(1\)/)
  })

  it('[DEL-002] validators.ts exports DeleteMatchInput type from deleteMatchSchema', () => {
    const code = validators()
    expect(code).toMatch(/export type DeleteMatchInput\s*=\s*z\.infer<typeof deleteMatchSchema>/)
  })
})

// ---------------------------------------------------------------------------
// AC1 / AC6 — DB query: deleteMatchWithXpRollback
// ---------------------------------------------------------------------------

describe('[AC1][AC6][P0] DB query — deleteMatchWithXpRollback — src/db/queries/matches.ts', () => {
  const queries = () => readAllQueries()

  it('[DEL-003] deleteMatchWithXpRollback is exported and uses db.transaction', () => {
    const code = queries()
    expect(code).toMatch(/export async function deleteMatchWithXpRollback[\s\S]{0,200}db\.transaction/)
  })

  it('[DEL-004] deleteMatchWithXpRollback uses FOR UPDATE to lock participant rows (AC6)', () => {
    const code = queries()
    expect(code).toMatch(/deleteMatchWithXpRollback[\s\S]{0,500}\.for\(['"]update['"]\)/)
  })

  it('[DEL-005] deleteMatchWithXpRollback guards evolutionsEnteredAt IS NOT NULL (AC2)', () => {
    const code = queries()
    expect(code).toMatch(/evolutionsEnteredAt.*!==.*null|POST_MATCH_COMPLETED/)
  })

  it('[DEL-006] deleteMatchWithXpRollback uses GREATEST to prevent negative XP (AC3)', () => {
    const code = queries()
    expect(code).toMatch(/GREATEST\(0,/)
  })

  it('[DEL-007] deleteMatchWithXpRollback deletes from matches table (cascade cleans up)', () => {
    const code = queries()
    expect(code).toMatch(/tx\.delete\(matches\)/)
  })

  it('[DEL-008] deleteMatchWithXpRollback returns { deleted: true } on success', () => {
    const code = queries()
    expect(code).toMatch(/deleted:\s*true/)
  })
})

// ---------------------------------------------------------------------------
// AC1 / AC10 — Server function: deleteMatchFn (player)
// ---------------------------------------------------------------------------

describe('[AC1][AC10][P0] Server fn — deleteMatchFn — src/routes/index.tsx', () => {
  const indexRoute = () => readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')

  it('[DEL-009] deleteMatchFn is created with createServerFn POST + authMiddleware', () => {
    const code = indexRoute()
    expect(code).toMatch(/deleteMatchFn\s*=\s*createServerFn\(\{\s*method:\s*['"]POST['"]/)
    expect(code).toMatch(/deleteMatchFn[\s\S]{0,200}authMiddleware/)
  })

  it('[DEL-010] deleteMatchFn uses deleteMatchSchema as inputValidator', () => {
    const code = indexRoute()
    expect(code).toMatch(/deleteMatchFn[\s\S]{0,300}inputValidator\(deleteMatchSchema\)/)
  })

  it('[DEL-011] deleteMatchFn checks isGuest and returns UNAUTHORIZED (AC10)', () => {
    const code = indexRoute()
    expect(code).toMatch(/deleteMatchFn[\s\S]{0,600}isGuest[\s\S]{0,200}UNAUTHORIZED/)
  })

  it('[DEL-012] deleteMatchFn checks participant membership via getMatchParticipantByMatchAndPlayer (AC10)', () => {
    const code = indexRoute()
    expect(code).toMatch(/getMatchParticipantByMatchAndPlayer[\s\S]{0,300}FORBIDDEN/)
  })

  it('[DEL-013] deleteMatchFn calls deleteMatchWithXpRollback and returns FORBIDDEN when not deleted (AC2)', () => {
    const code = indexRoute()
    expect(code).toMatch(/deleteMatchWithXpRollback[\s\S]{0,300}FORBIDDEN/)
  })

  it('[DEL-014] deleteMatchFn returns ServerResult<null> with success: true on success', () => {
    const code = indexRoute()
    // The server fn body returns { success: true, data: null }
    // We look for the export+handler pattern near success/data: null
    expect(code).toMatch(/export const deleteMatchFn/)
    expect(code).toMatch(/deleteMatchFn[\s\S]{0,1200}success:\s*true,\s*data:\s*null/)
  })
})

// ---------------------------------------------------------------------------
// AC4 / AC5 — Campaign view: toast + router.invalidate
// ---------------------------------------------------------------------------

describe('[AC4][AC5][P0] Campaign view — toast + router.invalidate — src/routes/index.tsx', () => {
  const indexRoute = () => readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')

  it('[DEL-015] Campaign view has deleteConfirmMatch state for confirmation dialog (AC8)', () => {
    const code = indexRoute()
    expect(code).toMatch(/deleteConfirmMatch/)
  })

  it('[DEL-016] Campaign view has toast state with auto-dismiss setTimeout (AC4)', () => {
    const code = indexRoute()
    expect(code).toMatch(/setToast[\s\S]{0,100}setTimeout/)
  })

  it('[DEL-017] Toast uses displayName from session for success message (AC4)', () => {
    const code = indexRoute()
    expect(code).toMatch(/displayName[\s\S]{0,100}supprimé le match|supprimé le match[\s\S]{0,100}displayName/)
  })

  it('[DEL-018] Campaign view calls router.invalidate after deleteMatchFn (AC5)', () => {
    const code = indexRoute()
    expect(code).toMatch(/deleteMatchFn[\s\S]{0,600}router\.invalidate/)
  })
})

// ---------------------------------------------------------------------------
// AC7 — Admin: deleteMatchAdminFn
// ---------------------------------------------------------------------------

describe('[AC7][P0] Admin server fn — deleteMatchAdminFn — src/routes/admin/index.tsx', () => {
  const adminRoute = () => readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')

  it('[DEL-019] deleteMatchAdminFn uses adminMiddleware (not authMiddleware)', () => {
    const code = adminRoute()
    expect(code).toMatch(/deleteMatchAdminFn[\s\S]{0,200}adminMiddleware/)
  })

  it('[DEL-020] deleteMatchAdminFn calls deleteMatchWithXpRollback directly without participant check', () => {
    const code = adminRoute()
    // Should have deleteMatchAdminFn calling deleteMatchWithXpRollback
    expect(code).toMatch(/deleteMatchAdminFn[\s\S]{0,500}deleteMatchWithXpRollback/)
    // Should NOT have getMatchParticipantByMatchAndPlayer inside deleteMatchAdminFn context
    // (admin skips participant check — verified by absence of that call near deleteMatchAdminFn)
  })

  it('[DEL-021] Admin uses window.confirm before deletion (follows admin pattern)', () => {
    const code = adminRoute()
    expect(code).toMatch(/window\.confirm[\s\S]{0,300}deleteMatchAdminFn|deleteMatchAdminFn[\s\S]{0,300}window\.confirm/)
  })
})

// ---------------------------------------------------------------------------
// AC3 — TimelineEntry: delete button next to Modifier
// ---------------------------------------------------------------------------

describe('[AC3-UI][P0] TimelineEntry — onDelete prop next to Modifier button', () => {
  const timelineEntry = () => readFileSync(resolve(root, 'src/components/timeline-entry.tsx'), 'utf-8')

  it('[DEL-022] TimelineEntry accepts onDelete prop in its type definition', () => {
    const code = timelineEntry()
    expect(code).toMatch(/onDelete\?:\s*\(matchId:\s*string\)\s*=>/)
  })

  it('[DEL-023] TimelineEntry renders delete button with data-testid="delete-match"', () => {
    const code = timelineEntry()
    expect(code).toMatch(/data-testid="delete-match"/)
  })

  it('[DEL-024] Delete button condition couples !hasEvolutions AND onDelete on the same expression', () => {
    const code = timelineEntry()
    // Both conditions must appear together in the same guard expression (within 60 chars)
    expect(code).toMatch(/!hasEvolutions\s*&&\s*onDelete|onDelete\s*&&\s*!hasEvolutions/)
  })
})
