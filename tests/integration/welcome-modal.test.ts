// tests/integration/welcome-modal.test.ts
// Story 1.3: First-Login Welcome Modal & Display Name
// Status: RED — written before implementation (ATDD)
//
// Verifies: AC1 (welcome modal on first login), AC2 (dismiss marks seen),
//           AC3 (display name update), AC4 (validation), AC5 (no repeat modal)
//
// These tests check the structure and contracts of story 1.3 implementation.
// Tests fail until all story 1.3 tasks are complete.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Project root = two levels up from tests/integration/
const root = resolve(__dirname, '../..')

// ---------------------------------------------------------------------------
// AC1 / AC5 — Auth module: hasSeenWelcome in SessionData
// ---------------------------------------------------------------------------

describe('[AC1][AC5][P0] Auth module — hasSeenWelcome in SessionData', () => {
  it('[1.3-INT-001] auth.ts SessionData type includes hasSeenWelcome: boolean', () => {
    const auth = readFileSync(resolve(root, 'src/lib/auth.ts'), 'utf-8')
    // Field must be declared as boolean — not just mentioned elsewhere
    expect(auth).toMatch(/hasSeenWelcome\s*:\s*boolean/)
  })

  it('[1.3-INT-002] getSession() selects hasSeenWelcome from players table (field + source on same expression)', () => {
    const auth = readFileSync(resolve(root, 'src/lib/auth.ts'), 'utf-8')
    // Both the field name and its source must be coupled — not two independent occurrences
    expect(auth).toContain('hasSeenWelcome: players.hasSeenWelcome')
  })
})

// ---------------------------------------------------------------------------
// AC3 / AC4 — Validator: updateDisplayNameSchema
// ---------------------------------------------------------------------------

describe('[AC3][AC4][P0] Validator — updateDisplayNameSchema', () => {
  it('[1.3-INT-003] validators.ts exports updateDisplayNameSchema', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')
    expect(validators).toContain('export const updateDisplayNameSchema')
  })

  it('[1.3-INT-004] validators.ts exports UpdateDisplayNameInput type', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')
    expect(validators).toContain('export type UpdateDisplayNameInput')
  })

  it('[1.3-INT-005] updateDisplayNameSchema applies .trim() before .min(1) to reject whitespace-only names', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')
    // .trim() must precede .min(1) in the chain — ensures "   " fails validation after trimming to ""
    expect(validators).toMatch(/\.trim\(\)\.min\(1/)
  })
})

// ---------------------------------------------------------------------------
// AC1 / AC2 / AC3 / AC4 — WelcomeModal component
// ---------------------------------------------------------------------------

describe('[AC1][AC2][AC3][AC4][P0] WelcomeModal component — src/components/welcome-modal.tsx', () => {
  it('[1.3-INT-006] src/components/welcome-modal.tsx exists', () => {
    expect(existsSync(resolve(root, 'src/components/welcome-modal.tsx'))).toBe(true)
  })

  it('[1.3-INT-007] welcome-modal.tsx exports WelcomeModal function', () => {
    const modal = readFileSync(resolve(root, 'src/components/welcome-modal.tsx'), 'utf-8')
    expect(modal).toContain('export function WelcomeModal')
  })

  it('[1.3-INT-008] welcome-modal.tsx imports Dialog from shadcn ui/dialog', () => {
    const modal = readFileSync(resolve(root, 'src/components/welcome-modal.tsx'), 'utf-8')
    // Dialog import and its source must be coupled — not independent occurrences
    expect(modal).toMatch(/import\s*\{[^}]*Dialog[^}]*\}\s*from\s*['"][^'"]*ui\/dialog['"]/)
  })

  it('[1.3-INT-009] welcome-modal.tsx calls onDismiss via onOpenChange — handles Escape and click-outside (AC2)', () => {
    const modal = readFileSync(resolve(root, 'src/components/welcome-modal.tsx'), 'utf-8')
    // onOpenChange and onDismiss must be coupled in the same JSX attribute expression
    expect(modal).toMatch(/onOpenChange\s*=\s*\{[^}]*onDismiss/)
  })

  it('[1.3-INT-010] welcome-modal.tsx uses updateDisplayNameSchema for form validation (coupled import + usage)', () => {
    const modal = readFileSync(resolve(root, 'src/components/welcome-modal.tsx'), 'utf-8')
    // Schema must be imported and used — not two independent occurrences
    expect(modal).toMatch(/import\s*\{[^}]*updateDisplayNameSchema[^}]*\}/)
    expect(modal).toContain('updateDisplayNameSchema')
  })

  it('[1.3-INT-011] welcome-modal.tsx uses TanStack Form useForm — no @tanstack/zod-form-adapter (deprecated)', () => {
    const modal = readFileSync(resolve(root, 'src/components/welcome-modal.tsx'), 'utf-8')
    // useForm must be imported from @tanstack/react-form directly
    expect(modal).toMatch(/import\s*\{[^}]*useForm[^}]*\}\s*from\s*['"]@tanstack\/react-form['"]/)
    // Adapter must NOT be used — it's obsolete for Zod v4 / Standard Schema
    expect(modal).not.toContain('@tanstack/zod-form-adapter')
  })
})

// ---------------------------------------------------------------------------
// AC2 / AC3 — Server functions in src/routes/index.tsx
//
// NOTE: authMiddleware is imported from src/lib/middleware.ts (centralized).
// middleware.ts uses a dynamic import of getSession to avoid leaking auth.ts
// (which imports @tanstack/react-start/server) into the client bundle.
// See: https://tanstack.com/start/latest/docs/framework/react/guide/import-protection
// ---------------------------------------------------------------------------

describe('[AC2][AC3][P0] Server functions — src/routes/index.tsx', () => {
  it('[1.3-INT-012] index.tsx defines markWelcomeSeenFn using createServerFn', () => {
    const indexRoute = readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
    // Function name and createServerFn must be on the same assignment
    expect(indexRoute).toMatch(/markWelcomeSeenFn\s*=\s*createServerFn/)
  })

  it('[1.3-INT-013] markWelcomeSeenFn chains .middleware([authMiddleware]) — no inline session check', () => {
    const indexRoute = readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
    // createServerFn assignment and .middleware([authMiddleware]) must be in the same call chain
    expect(indexRoute).toMatch(/markWelcomeSeenFn\s*=\s*createServerFn[\s\S]{0,300}\.middleware\(\[authMiddleware\]\)/)
  })

  it('[1.3-INT-014] index.tsx defines updateDisplayNameFn using createServerFn', () => {
    const indexRoute = readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
    // Function name and createServerFn must be on the same assignment
    expect(indexRoute).toMatch(/updateDisplayNameFn\s*=\s*createServerFn/)
  })

  it('[1.3-INT-015] updateDisplayNameFn uses .inputValidator(updateDisplayNameSchema) — schema and method coupled', () => {
    const indexRoute = readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
    // inputValidator and the schema must be on the same call — not two independent occurrences
    expect(indexRoute).toMatch(/\.inputValidator\(updateDisplayNameSchema\)/)
  })

  it('[1.3-INT-015b] authMiddleware in index.tsx is imported from lib/middleware — import-protection handled centrally', () => {
    const indexRoute = readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
    // authMiddleware must be imported from middleware.ts (not defined locally, not from auth.ts)
    expect(indexRoute).toMatch(/import\s*\{[^}]*authMiddleware[^}]*\}\s*from\s*['"]\.\.\/lib\/middleware['"]/)
    // No local createMiddleware definition (would duplicate the pattern across every route)
    expect(indexRoute).not.toMatch(/authMiddleware\s*=\s*createMiddleware/)
    // No static import from auth.ts (would leak server-only to client bundle)
    expect(indexRoute).not.toMatch(/import\s*\{[^}]*authMiddleware[^}]*\}\s*from\s*['"]\.\.\/lib\/auth['"]/)
  })

  it('[1.3-INT-015c] lib/middleware.ts uses dynamic import of getSession — import-protection at the source', () => {
    const middleware = readFileSync(resolve(root, 'src/lib/middleware.ts'), 'utf-8')
    // authMiddleware must be exported from middleware.ts
    expect(middleware).toMatch(/export const authMiddleware\s*=\s*createMiddleware/)
    // getSession must be dynamically imported — never statically at module level
    expect(middleware).toMatch(/import\(['"]\.\/auth['"]\)/)
    // No static import from auth.ts at module level
    expect(middleware).not.toMatch(/^import\s*\{[^}]*getSession[^}]*\}\s*from\s*['"]\.\/auth['"]/m)
  })
})

// ---------------------------------------------------------------------------
// AC1 / AC5 — WelcomeModal integration in src/routes/index.tsx
// ---------------------------------------------------------------------------

describe('[AC1][AC5][P0] WelcomeModal integration — src/routes/index.tsx', () => {
  it('[1.3-INT-016] index.tsx imports WelcomeModal component', () => {
    const indexRoute = readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
    // WelcomeModal must be imported — not just mentioned in JSX
    expect(indexRoute).toMatch(/import\s*\{[^}]*WelcomeModal[^}]*\}/)
  })

  it('[1.3-INT-017] index.tsx initializes modalOpen with hasSeenWelcome === false (shows on first login only — AC1 and AC5)', () => {
    const indexRoute = readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
    // useState must be initialised with the hasSeenWelcome === false expression — coupled in one statement
    expect(indexRoute).toMatch(/useState\([^)]*hasSeenWelcome\s*===\s*false[^)]*\)/)
  })
})
