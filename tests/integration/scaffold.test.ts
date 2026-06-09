// tests/integration/scaffold.test.ts
// Story 1.1: Project Scaffolding & Deployment Pipeline
// Status: RED — write before implementing (ATDD)
//
// These tests verify that Story 1.1 acceptance criteria are fully met.
// All tests are skipped (test.skip) until the scaffold is complete.
// Remove each test.skip() as you implement and verify each criterion.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Project root = two levels up from tests/integration/
const root = resolve(__dirname, '../..')

// ---------------------------------------------------------------------------
// AC1 — TanStack CLI initialization
// ---------------------------------------------------------------------------

describe('[AC1][P0] TanStack CLI initialization — project structure', () => {
  it('[1.1-UNIT-001] vite.config.ts exists (TanStack Start + Vite config)', () => {
    // Note: CLI generates vite.config.ts (not app.config.ts) in current RC
    expect(existsSync(resolve(root, 'vite.config.ts'))).toBe(true)
  })

  it('[1.1-UNIT-002] drizzle.config.ts exists (drizzle add-on)', () => {
    expect(existsSync(resolve(root, 'drizzle.config.ts'))).toBe(true)
  })

  it('[1.1-UNIT-003] src/db/schema.ts exists (drizzle add-on)', () => {
    expect(existsSync(resolve(root, 'src/db/schema.ts'))).toBe(true)
  })

  it('[1.1-UNIT-004] src/db/index.ts exists (drizzle add-on)', () => {
    expect(existsSync(resolve(root, 'src/db/index.ts'))).toBe(true)
  })

  it('[1.1-UNIT-005] src/components/ui/ directory exists (shadcn add-on)', () => {
    expect(existsSync(resolve(root, 'src/components/ui'))).toBe(true)
  })

  it('[1.1-UNIT-007] package.json has lint script (eslint add-on)', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
    expect(pkg.scripts).toHaveProperty('lint')
  })

  it('[1.1-UNIT-008] package.json has format script (eslint add-on)', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
    expect(pkg.scripts).toHaveProperty('format')
  })

  it('[1.1-UNIT-009] src/routes/__root.tsx exists (TanStack Router root layout)', () => {
    expect(existsSync(resolve(root, 'src/routes/__root.tsx'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// AC2 — Additional dev dependencies
// Note: [1.1-UNIT-010] IS the placeholder test — it must pass, not skip.
// It lives at src/lib/placeholder.test.ts (created by Task 2 of the story).
// The tests below verify the config files exist.
// ---------------------------------------------------------------------------

describe('[AC2][P0] Additional dev dependencies', () => {
  it('[1.1-UNIT-011] vitest.config.ts exists', () => {
    expect(existsSync(resolve(root, 'vitest.config.ts'))).toBe(true)
  })

  it.skip('[1.1-UNIT-012] playwright.config.ts exists (e2e removed)', () => {
    expect(existsSync(resolve(root, 'playwright.config.ts'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// AC3 — GitHub Actions CI pipeline
// ---------------------------------------------------------------------------

describe('[AC3][P1] GitHub Actions CI pipeline', () => {
  it('[1.1-UNIT-013] .github/workflows/ci.yml exists', () => {
    expect(existsSync(resolve(root, '.github/workflows/ci.yml'))).toBe(true)
  })

  it('[1.1-UNIT-014] CI pipeline runs pnpm lint step', () => {
    const ci = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf-8')
    expect(ci).toContain('pnpm lint')
  })

  it('[1.1-UNIT-015] CI pipeline runs pnpm typecheck step', () => {
    const ci = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf-8')
    expect(ci).toContain('pnpm typecheck')
  })

  it('[1.1-UNIT-016] CI pipeline runs pnpm test step', () => {
    const ci = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf-8')
    expect(ci).toContain('pnpm test')
  })

  it('[1.1-UNIT-017] CI pipeline triggers on pull_request to main', () => {
    const ci = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf-8')
    expect(ci).toContain('pull_request')
    expect(ci).toContain('main')
  })
})

// ---------------------------------------------------------------------------
// AC5 — Railway environment variables
// ---------------------------------------------------------------------------

describe('[AC5][P1] Railway environment variables & DB health check', () => {
  it('[1.1-UNIT-018] .env.example exists (no secrets committed to repo)', () => {
    expect(existsSync(resolve(root, '.env.example'))).toBe(true)
  })

  it('[1.1-UNIT-019] .env.example contains DATABASE_URL placeholder', () => {
    const envExample = readFileSync(resolve(root, '.env.example'), 'utf-8')
    expect(envExample).toContain('DATABASE_URL')
  })

  it('[1.1-UNIT-020] .env.example contains SESSION_SECRET placeholder', () => {
    const envExample = readFileSync(resolve(root, '.env.example'), 'utf-8')
    expect(envExample).toContain('SESSION_SECRET')
  })

  it('[1.1-UNIT-021] .env.example contains ADMIN_PASSWORD_HASH placeholder', () => {
    const envExample = readFileSync(resolve(root, '.env.example'), 'utf-8')
    expect(envExample).toContain('ADMIN_PASSWORD_HASH')
  })

  it('[1.1-UNIT-022] .gitignore contains .env entry', () => {
    const gitignore = readFileSync(resolve(root, '.gitignore'), 'utf-8')
    // Match .env as a standalone line (not .env.example)
    expect(gitignore).toMatch(/^\.env$/m)
  })

  it('[1.1-UNIT-023] src/db/index.ts contains DB startup health check (SELECT 1)', () => {
    const dbIndex = readFileSync(resolve(root, 'src/db/index.ts'), 'utf-8')
    expect(dbIndex).toContain('SELECT 1')
  })
})

// ---------------------------------------------------------------------------
// AC6 — Design system bootstrap
// ---------------------------------------------------------------------------

describe('[AC6][P2] Design system bootstrap — palette tokens & fonts', () => {
  it('[1.1-UNIT-024] src/styles/globals.css exists', () => {
    expect(existsSync(resolve(root, 'src/styles/globals.css'))).toBe(true)
  })

  it('[1.1-UNIT-025] globals.css contains --color-bg token (#f1eade)', () => {
    const css = readFileSync(resolve(root, 'src/styles/globals.css'), 'utf-8')
    expect(css).toContain('--color-bg: #f1eade')
  })

  it('[1.1-UNIT-026] globals.css contains --color-brand token (#334155)', () => {
    const css = readFileSync(resolve(root, 'src/styles/globals.css'), 'utf-8')
    expect(css).toContain('--color-brand: #334155')
  })

  it('[1.1-UNIT-027] globals.css contains --font-display (Cinzel)', () => {
    const css = readFileSync(resolve(root, 'src/styles/globals.css'), 'utf-8')
    expect(css).toContain("--font-display: 'Cinzel'")
  })

  it('[1.1-UNIT-028] globals.css contains @font-face for cinzel-600.woff2', () => {
    const css = readFileSync(resolve(root, 'src/styles/globals.css'), 'utf-8')
    expect(css).toContain('cinzel-600.woff2')
  })

  it('[1.1-UNIT-029] public/fonts/cinzel-600.woff2 exists', () => {
    expect(existsSync(resolve(root, 'public/fonts/cinzel-600.woff2'))).toBe(true)
  })

  it('[1.1-UNIT-030] public/fonts/cinzel-700.woff2 exists', () => {
    expect(existsSync(resolve(root, 'public/fonts/cinzel-700.woff2'))).toBe(true)
  })

  it('[1.1-UNIT-031] public/fonts/inter-400.woff2 exists', () => {
    expect(existsSync(resolve(root, 'public/fonts/inter-400.woff2'))).toBe(true)
  })

  it('[1.1-UNIT-032] public/fonts/inter-500.woff2 exists', () => {
    expect(existsSync(resolve(root, 'public/fonts/inter-500.woff2'))).toBe(true)
  })

  it('[1.1-UNIT-033] public/fonts/inter-700.woff2 exists', () => {
    expect(existsSync(resolve(root, 'public/fonts/inter-700.woff2'))).toBe(true)
  })
})
