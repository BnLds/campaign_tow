// tests/integration/placeholder.test.ts
// Story 1.1: Project Scaffolding & Deployment Pipeline
// AC2: pnpm test runs and passes with a placeholder test
//
// IMPORTANT: When the project is scaffolded, move this file to:
//   src/lib/placeholder.test.ts
// (co-located with source as per project test conventions)

import { it, expect } from 'vitest'

// [1.1-UNIT-010][P0] This test verifies that Vitest is correctly configured
// and can run. It must PASS (not skip) — it IS the placeholder test from AC2.
it('[1.1-UNIT-010] Vitest runs correctly — placeholder always passes', () => {
  expect(true).toBe(true)
})
