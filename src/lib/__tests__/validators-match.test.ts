// src/lib/__tests__/validators-match.test.ts
// Story 3.3: Match Result Entry
// Status: RED — written before implementation (TDD)
//
// Tests for submitMatchResultSchema — Zod validation schema for result entry input.
// Follows the pattern established in tests/integration/2-2-validators.test.ts.
//
// Covers Task 2.1, 2.2 and story task 7.18.
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')

function getValidators() {
  return readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')
}

// ---------------------------------------------------------------------------
// AC1 — submitMatchResultSchema structural contract (Task 7.18 — file-contract part)
// ---------------------------------------------------------------------------

describe('[AC1][P0] submitMatchResultSchema — validators.ts file contract', () => {
  // AC: 1 — Task 2.1: schema is exported from validators.ts
  it('[3.3-VAL-001] validators.ts exports submitMatchResultSchema', () => {
    const validators = getValidators()
    expect(validators).toContain('export const submitMatchResultSchema')
  })

  // AC: 1 — Task 2.1: schema validates matchId as non-empty string
  it('[3.3-VAL-002] submitMatchResultSchema includes matchId: z.string().min(1)', () => {
    const validators = getValidators()
    expect(validators).toMatch(/submitMatchResultSchema[\s\S]{0,400}matchId[\s\S]{0,200}z\.string/)
  })

  // AC: 1 — Task 2.1: matchId uses min(1) to reject empty strings
  it('[3.3-VAL-003] submitMatchResultSchema matchId uses min(1) validation', () => {
    const validators = getValidators()
    expect(validators).toMatch(/submitMatchResultSchema[\s\S]{0,600}matchId[\s\S]{0,300}min\(1\)/)
  })

  // AC: 1 — Task 2.1: result is validated as enum(['victory', 'defeat', 'draw'])
  it('[3.3-VAL-004] submitMatchResultSchema includes result: z.enum with victory, defeat, draw', () => {
    const validators = getValidators()
    expect(validators).toMatch(/submitMatchResultSchema[\s\S]{0,400}result[\s\S]{0,200}z\.enum/)
  })

  // AC: 1 — Task 2.1: enum contains exactly the 3 valid values
  it('[3.3-VAL-005] submitMatchResultSchema result enum contains victory, defeat, draw', () => {
    const validators = getValidators()
    expect(validators).toMatch(/submitMatchResultSchema[\s\S]{0,600}result[\s\S]{0,300}victory[\s\S]{0,100}defeat[\s\S]{0,100}draw/)
  })

  // AC: 1 — Task 2.2: SubmitMatchResultInput type is exported
  it('[3.3-VAL-006] validators.ts exports SubmitMatchResultInput type', () => {
    const validators = getValidators()
    expect(validators).toContain('SubmitMatchResultInput')
  })

  // AC: 1 — Task 2.2: SubmitMatchResultInput is inferred from schema
  it('[3.3-VAL-007] SubmitMatchResultInput is derived via z.infer from submitMatchResultSchema', () => {
    const validators = getValidators()
    expect(validators).toMatch(/SubmitMatchResultInput\s*=\s*z\.infer<typeof submitMatchResultSchema>/)
  })
})

// ---------------------------------------------------------------------------
// AC1 — submitMatchResultSchema runtime validation behavior (Task 7.18)
// ---------------------------------------------------------------------------

describe('[AC1][P0] submitMatchResultSchema — runtime validation (Task 7.18)', () => {
  // AC: 1 — Task 7.18: accepts valid input { matchId: 'abc', result: 'victory' }
  it('[3.3-VAL-008] submitMatchResultSchema accepts valid input { matchId: "abc", result: "victory" }', async () => {
    const { submitMatchResultSchema } = await import('../validators')
    const result = submitMatchResultSchema.safeParse({ matchId: 'abc', result: 'victory' })
    expect(result.success).toBe(true)
  })

  // AC: 1 — Task 7.18: accepts result='defeat'
  it('[3.3-VAL-009] submitMatchResultSchema accepts result="defeat"', async () => {
    const { submitMatchResultSchema } = await import('../validators')
    const result = submitMatchResultSchema.safeParse({ matchId: 'match-1', result: 'defeat' })
    expect(result.success).toBe(true)
  })

  // AC: 1 — Task 7.18: accepts result='draw'
  it('[3.3-VAL-010] submitMatchResultSchema accepts result="draw"', async () => {
    const { submitMatchResultSchema } = await import('../validators')
    const result = submitMatchResultSchema.safeParse({ matchId: 'match-1', result: 'draw' })
    expect(result.success).toBe(true)
  })

  // AC: 1 — Task 7.18: rejects empty matchId
  it('[3.3-VAL-011] submitMatchResultSchema rejects empty matchId (matchId: "")', async () => {
    const { submitMatchResultSchema } = await import('../validators')
    const result = submitMatchResultSchema.safeParse({ matchId: '', result: 'victory' })
    expect(result.success).toBe(false)
  })

  // AC: 1 — Task 7.18: rejects invalid result value 'win' (not in enum)
  it('[3.3-VAL-012] submitMatchResultSchema rejects invalid result value "win"', async () => {
    const { submitMatchResultSchema } = await import('../validators')
    const result = submitMatchResultSchema.safeParse({ matchId: 'abc', result: 'win' })
    expect(result.success).toBe(false)
  })

  // AC: 1 — rejects missing matchId field
  it('[3.3-VAL-013] submitMatchResultSchema rejects missing matchId field', async () => {
    const { submitMatchResultSchema } = await import('../validators')
    const result = submitMatchResultSchema.safeParse({ result: 'victory' })
    expect(result.success).toBe(false)
  })

  // AC: 1 — rejects missing result field
  it('[3.3-VAL-014] submitMatchResultSchema rejects missing result field', async () => {
    const { submitMatchResultSchema } = await import('../validators')
    const result = submitMatchResultSchema.safeParse({ matchId: 'abc' })
    expect(result.success).toBe(false)
  })

  // AC: 1 — rejects result='lose' (common mistake, not a valid value)
  it('[3.3-VAL-015] submitMatchResultSchema rejects result="lose" (not a valid enum value)', async () => {
    const { submitMatchResultSchema } = await import('../validators')
    const result = submitMatchResultSchema.safeParse({ matchId: 'abc', result: 'lose' })
    expect(result.success).toBe(false)
  })

  // AC: 1 — valid data parses to correct TypeScript shape
  it('[3.3-VAL-016] submitMatchResultSchema parse returns { matchId, result } shape', async () => {
    const { submitMatchResultSchema } = await import('../validators')
    const result = submitMatchResultSchema.safeParse({ matchId: 'match-xyz', result: 'draw' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.matchId).toBe('match-xyz')
      expect(result.data.result).toBe('draw')
    }
  })
})
