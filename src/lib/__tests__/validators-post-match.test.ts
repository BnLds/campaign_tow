// src/lib/__tests__/validators-post-match.test.ts
// Story 4.1: Post-Match Flow — XP Entry per Unit & Character
// Status: RED — written before implementation (TDD)
//
// Tests for:
//   - submitUnitXpSchema — validates { unitId, xpGained }
//   - completeEvolutionsSchema — validates { matchId }
//
// Follows the pattern established in src/lib/__tests__/validators-match.test.ts.
//
// Covers Tasks 10.8–10.9 (AC: 3, 4, 5)
// All tests will fail until the implementation is complete.

import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import type { completeEvolutionsWithGainsSchema as CompleteSchemaType } from '../validators'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')

function getValidators() {
  return readFileSync(resolve(root, 'src/lib/validators/post-match.ts'), 'utf-8')
}

// ---------------------------------------------------------------------------
// 10.8 — submitUnitXpSchema structural contract (Task 2.1)
// AC: 3, 4, 8
// ---------------------------------------------------------------------------

describe('[AC3][AC4][AC8][P0] submitUnitXpSchema — validators.ts file contract', () => {
  // 10.8 — schema is exported from validators.ts
  it('[4.1-VAL-001] validators.ts exports submitUnitXpSchema', () => {
    const validators = getValidators()
    expect(validators).toContain('export const submitUnitXpSchema')
  })

  // 10.8 — schema validates unitId as non-empty string
  it('[4.1-VAL-002] submitUnitXpSchema includes unitId: z.string().min(1)', () => {
    const validators = getValidators()
    expect(validators).toMatch(/submitUnitXpSchema[\s\S]{0,400}unitId[\s\S]{0,200}z\.string[\s\S]{0,100}min\(1\)/)
  })

  // 10.8 — schema validates xpGained as integer
  it('[4.1-VAL-003] submitUnitXpSchema includes xpGained: z.number().int()', () => {
    const validators = getValidators()
    expect(validators).toMatch(/submitUnitXpSchema[\s\S]{0,500}xpGained[\s\S]{0,200}z\.number[\s\S]{0,100}\.int\(\)/)
  })

  // 10.8 — schema enforces min(0) on xpGained
  it('[4.1-VAL-004] submitUnitXpSchema xpGained uses min(0) to reject negative values', () => {
    const validators = getValidators()
    expect(validators).toMatch(/submitUnitXpSchema[\s\S]{0,600}xpGained[\s\S]{0,300}min\(0\)/)
  })

  // 10.8 — schema enforces max(99) on xpGained
  it('[4.1-VAL-005] submitUnitXpSchema xpGained uses max(99) to reject values >= 100', () => {
    const validators = getValidators()
    expect(validators).toMatch(/submitUnitXpSchema[\s\S]{0,700}xpGained[\s\S]{0,300}max\(99\)/)
  })

  // 10.8 — SubmitUnitXpInput type is exported
  it('[4.1-VAL-006] validators.ts exports SubmitUnitXpInput type', () => {
    const validators = getValidators()
    expect(validators).toContain('SubmitUnitXpInput')
  })

  // 10.8 — SubmitUnitXpInput is derived via z.infer
  it('[4.1-VAL-007] SubmitUnitXpInput is derived via z.infer from submitUnitXpSchema', () => {
    const validators = getValidators()
    expect(validators).toMatch(/SubmitUnitXpInput\s*=\s*z\.infer<typeof submitUnitXpSchema>/)
  })
})

// ---------------------------------------------------------------------------
// 10.8 — submitUnitXpSchema runtime validation behavior
// AC: 3, 4, 8
// ---------------------------------------------------------------------------

describe('[AC3][AC4][AC8][P0] submitUnitXpSchema — runtime validation (Task 10.8)', () => {
  // 10.8 — accepts valid input { matchParticipantId, unitId: 'abc', xpGained: 3 }
  it('[4.1-VAL-008] submitUnitXpSchema accepts valid input { unitId: "abc", xpGained: 3 }', async () => {
    const { submitUnitXpSchema } = await import('../validators')
    const result = submitUnitXpSchema.safeParse({ matchParticipantId: 'p-1', unitId: 'abc', xpGained: 3 })
    expect(result.success).toBe(true)
  })

  // 10.8 — accepts xpGained: 0 (AC8: zero XP is valid)
  it('[4.1-VAL-009] submitUnitXpSchema accepts xpGained: 0 (zero XP is valid per AC8)', async () => {
    const { submitUnitXpSchema } = await import('../validators')
    const result = submitUnitXpSchema.safeParse({ matchParticipantId: 'p-1', unitId: 'unit-1', xpGained: 0 })
    expect(result.success).toBe(true)
  })

  // 10.8 — accepts xpGained: 99 (max boundary)
  it('[4.1-VAL-010] submitUnitXpSchema accepts xpGained: 99 (max boundary)', async () => {
    const { submitUnitXpSchema } = await import('../validators')
    const result = submitUnitXpSchema.safeParse({ matchParticipantId: 'p-1', unitId: 'unit-1', xpGained: 99 })
    expect(result.success).toBe(true)
  })

  // 10.8 — rejects { unitId: '', xpGained: -1 }
  it('[4.1-VAL-011] submitUnitXpSchema rejects empty unitId (unitId: "")', async () => {
    const { submitUnitXpSchema } = await import('../validators')
    const result = submitUnitXpSchema.safeParse({ unitId: '', xpGained: 3 })
    expect(result.success).toBe(false)
  })

  // 10.8 — rejects xpGained: -1 (below min)
  it('[4.1-VAL-012] submitUnitXpSchema rejects xpGained: -1 (below min 0)', async () => {
    const { submitUnitXpSchema } = await import('../validators')
    const result = submitUnitXpSchema.safeParse({ unitId: 'abc', xpGained: -1 })
    expect(result.success).toBe(false)
  })

  // 10.8 — rejects xpGained: 100 (above max)
  it('[4.1-VAL-013] submitUnitXpSchema rejects xpGained: 100 (above max 99)', async () => {
    const { submitUnitXpSchema } = await import('../validators')
    const result = submitUnitXpSchema.safeParse({ unitId: 'abc', xpGained: 100 })
    expect(result.success).toBe(false)
  })

  // 10.8 — rejects non-integer xpGained (e.g. 1.5)
  it('[4.1-VAL-014] submitUnitXpSchema rejects non-integer xpGained: 1.5', async () => {
    const { submitUnitXpSchema } = await import('../validators')
    const result = submitUnitXpSchema.safeParse({ unitId: 'abc', xpGained: 1.5 })
    expect(result.success).toBe(false)
  })

  // 10.8 — valid data parses to correct TypeScript shape
  it('[4.1-VAL-015] submitUnitXpSchema parse returns { unitId, xpGained } shape', async () => {
    const { submitUnitXpSchema } = await import('../validators')
    const result = submitUnitXpSchema.safeParse({ matchParticipantId: 'p-1', unitId: 'unit-xyz', xpGained: 5 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unitId).toBe('unit-xyz')
      expect(result.data.xpGained).toBe(5)
    }
  })
})

// ---------------------------------------------------------------------------
// 10.9 — completeEvolutionsSchema structural contract (Task 2.2)
// AC: 5
// ---------------------------------------------------------------------------

describe('[AC5][P0] completeEvolutionsSchema — validators.ts file contract', () => {
  // 10.9 — schema is exported from validators.ts
  it('[4.1-VAL-016] validators.ts exports completeEvolutionsSchema', () => {
    const validators = getValidators()
    expect(validators).toContain('export const completeEvolutionsSchema')
  })

  // 10.9 — schema validates matchId as non-empty string
  it('[4.1-VAL-017] completeEvolutionsSchema includes matchId: z.string().min(1)', () => {
    const validators = getValidators()
    expect(validators).toMatch(/completeEvolutionsSchema[\s\S]{0,400}matchId[\s\S]{0,200}z\.string[\s\S]{0,100}min\(1\)/)
  })

  // 10.9 — CompleteEvolutionsInput type is exported
  it('[4.1-VAL-018] validators.ts exports CompleteEvolutionsInput type', () => {
    const validators = getValidators()
    expect(validators).toContain('CompleteEvolutionsInput')
  })

  // 10.9 — CompleteEvolutionsInput is derived via z.infer
  it('[4.1-VAL-019] CompleteEvolutionsInput is derived via z.infer from completeEvolutionsSchema', () => {
    const validators = getValidators()
    expect(validators).toMatch(/CompleteEvolutionsInput\s*=\s*z\.infer<typeof completeEvolutionsSchema>/)
  })
})

// ---------------------------------------------------------------------------
// 10.9 — completeEvolutionsSchema runtime validation behavior
// AC: 5
// ---------------------------------------------------------------------------

describe('[AC5][P0] completeEvolutionsSchema — runtime validation (Task 10.9)', () => {
  // 10.9 — accepts valid input { matchId: 'abc' }
  it('[4.1-VAL-020] completeEvolutionsSchema accepts valid input { matchId: "abc" }', async () => {
    const { completeEvolutionsSchema } = await import('../validators')
    const result = completeEvolutionsSchema.safeParse({ matchId: 'abc' })
    expect(result.success).toBe(true)
  })

  // 10.9 — rejects empty matchId
  it('[4.1-VAL-021] completeEvolutionsSchema rejects empty matchId (matchId: "")', async () => {
    const { completeEvolutionsSchema } = await import('../validators')
    const result = completeEvolutionsSchema.safeParse({ matchId: '' })
    expect(result.success).toBe(false)
  })

  // 10.9 — rejects missing matchId
  it('[4.1-VAL-022] completeEvolutionsSchema rejects missing matchId field', async () => {
    const { completeEvolutionsSchema } = await import('../validators')
    const result = completeEvolutionsSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  // 10.9 — valid data parses to correct shape
  it('[4.1-VAL-023] completeEvolutionsSchema parse returns { matchId } shape', async () => {
    const { completeEvolutionsSchema } = await import('../validators')
    const result = completeEvolutionsSchema.safeParse({ matchId: 'match-xyz' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.matchId).toBe('match-xyz')
    }
  })
})

// ---------------------------------------------------------------------------
// Story 4-1b — submitUnitXpSchema now includes matchParticipantId (AC1, AC3)
// ---------------------------------------------------------------------------

describe('[AC1][AC3][P0] submitUnitXpSchema — matchParticipantId structural contract (Story 4-1b)', () => {
  // 4-1b — schema includes matchParticipantId as non-empty string
  it('[4.1b-VAL-001] submitUnitXpSchema includes matchParticipantId: z.string().min(1)', () => {
    const validators = getValidators()
    expect(validators).toMatch(/submitUnitXpSchema[\s\S]{0,600}matchParticipantId[\s\S]{0,200}z\.string[\s\S]{0,100}min\(1\)/)
  })
})

// ---------------------------------------------------------------------------
// Story 4-1b — submitUnitXpSchema runtime with matchParticipantId (AC1, AC3)
// ---------------------------------------------------------------------------

describe('[AC1][AC3][P0] submitUnitXpSchema — matchParticipantId runtime validation (Story 4-1b)', () => {
  // 4-1b — accepts valid input with matchParticipantId
  it('[4.1b-VAL-002] submitUnitXpSchema accepts valid input { matchParticipantId: "p-1", unitId: "u-1", xpGained: 3 }', async () => {
    const { submitUnitXpSchema } = await import('../validators')
    const result = submitUnitXpSchema.safeParse({ matchParticipantId: 'p-1', unitId: 'u-1', xpGained: 3 })
    expect(result.success).toBe(true)
  })

  // 4-1b — rejects missing matchParticipantId
  it('[4.1b-VAL-003] submitUnitXpSchema rejects missing matchParticipantId', async () => {
    const { submitUnitXpSchema } = await import('../validators')
    const result = submitUnitXpSchema.safeParse({ unitId: 'u-1', xpGained: 3 })
    expect(result.success).toBe(false)
  })

  // 4-1b — rejects empty matchParticipantId
  it('[4.1b-VAL-004] submitUnitXpSchema rejects empty matchParticipantId', async () => {
    const { submitUnitXpSchema } = await import('../validators')
    const result = submitUnitXpSchema.safeParse({ matchParticipantId: '', unitId: 'u-1', xpGained: 3 })
    expect(result.success).toBe(false)
  })

  // 4-1b — parse with matchParticipantId returns it in data shape
  it('[4.1b-VAL-005] submitUnitXpSchema parse with matchParticipantId returns it in data shape', async () => {
    const { submitUnitXpSchema } = await import('../validators')
    const result = submitUnitXpSchema.safeParse({ matchParticipantId: 'p-42', unitId: 'unit-xyz', xpGained: 5 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.matchParticipantId).toBe('p-42')
      expect(result.data.unitId).toBe('unit-xyz')
      expect(result.data.xpGained).toBe(5)
    }
  })
})

// ---------------------------------------------------------------------------
// validateConsequenceEntry — tested through completeEvolutionsWithGainsSchema
// ---------------------------------------------------------------------------

describe('validateConsequenceEntry — via completeEvolutionsWithGainsSchema', () => {
  let completeEvolutionsWithGainsSchema: typeof CompleteSchemaType

  beforeAll(async () => {
    const mod = await import('../validators')
    completeEvolutionsWithGainsSchema = mod.completeEvolutionsWithGainsSchema
  })

  const wrap = (consequence: Record<string, unknown>) => ({
    matchId: 'm1',
    matchParticipantId: 'mp1',
    gains: [],
    consequences: [{ unitId: 'u1', ...consequence }],
  })

  it('permanent_injury with stat+delta → valid', () => {
    const result = completeEvolutionsWithGainsSchema.safeParse(wrap({ type: 'permanent_injury', stat: 'pv', delta: -1 }))
    expect(result.success).toBe(true)
  })

  it('permanent_injury without stat → invalid', () => {
    const result = completeEvolutionsWithGainsSchema.safeParse(wrap({ type: 'permanent_injury', delta: -1 }))
    expect(result.success).toBe(false)
  })

  it('permanent_injury without delta → invalid', () => {
    const result = completeEvolutionsWithGainsSchema.safeParse(wrap({ type: 'permanent_injury', stat: 'pv' }))
    expect(result.success).toBe(false)
  })

  it('grave_injury without stat → invalid', () => {
    const result = completeEvolutionsWithGainsSchema.safeParse(wrap({ type: 'grave_injury', delta: -1 }))
    expect(result.success).toBe(false)
  })

  it('death with no stat/delta → valid', () => {
    const result = completeEvolutionsWithGainsSchema.safeParse(wrap({ type: 'death' }))
    expect(result.success).toBe(true)
  })

  it('death with stat → invalid (forbidden)', () => {
    const result = completeEvolutionsWithGainsSchema.safeParse(wrap({ type: 'death', stat: 'pv' }))
    expect(result.success).toBe(false)
  })

  it('deroute_sanglante with xpLostAmount > 0 → valid', () => {
    const result = completeEvolutionsWithGainsSchema.safeParse(wrap({ type: 'deroute_sanglante', xpLostAmount: 5 }))
    expect(result.success).toBe(true)
  })

  it('deroute_sanglante with xpLostAmount = 0 → invalid', () => {
    const result = completeEvolutionsWithGainsSchema.safeParse(wrap({ type: 'deroute_sanglante', xpLostAmount: 0 }))
    expect(result.success).toBe(false)
  })

  it('no_effect → valid (no fields required)', () => {
    const result = completeEvolutionsWithGainsSchema.safeParse(wrap({ type: 'no_effect' }))
    expect(result.success).toBe(true)
  })

  it('haine with delta → invalid (forbidden)', () => {
    const result = completeEvolutionsWithGainsSchema.safeParse(wrap({ type: 'haine', delta: -1 }))
    expect(result.success).toBe(false)
  })

  it.each(['miracule', 'rancune', 'fureur_vengeresse', 'survivants_endurcis'] as const)(
    '%s with stat → invalid (forbidsStatDelta)',
    (type) => {
      const result = completeEvolutionsWithGainsSchema.safeParse(wrap({ type, stat: 'pv' }))
      expect(result.success).toBe(false)
    }
  )
})
