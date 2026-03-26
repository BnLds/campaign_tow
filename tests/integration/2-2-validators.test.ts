// tests/integration/2-2-validators.test.ts
// Story 2.2: Manual Unit Entry & Post-Import Correction
// Status: RED — written before implementation (ATDD)
//
// Verifies: AC1 (addUnitSchema), AC2 (updateSubProfileSchema)
// Tasks covered: Task 1.1, 1.2, 1.3, 6.1–6.10
//
// Project pattern: static file-contract tests (read source, assert structure)
// + runtime Zod validation tests.
// Tests pass once all story 2.2 Task 1 subtasks are complete.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Project root = two levels up from tests/integration/
const root = resolve(__dirname, '../..')

// ---------------------------------------------------------------------------
// Static contract tests — validators.ts structure
// ---------------------------------------------------------------------------

describe('[AC1][AC2][P0] Validators structure — src/lib/validators/army.ts', () => {
  it('[2.2-VAL-001] validators/army.ts exports addUnitSchema', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators/army.ts'), 'utf-8')
    expect(validators).toContain('export const addUnitSchema')
  })

  it('[2.2-VAL-002] addUnitSchema has name field with .trim().min(1) (whitespace-only names rejected)', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators/army.ts'), 'utf-8')
    // name, trim and min(1) must be coupled inside addUnitSchema
    expect(validators).toMatch(/addUnitSchema[\s\S]{0,400}name[\s\S]{0,100}\.trim\(\)\.min\(1/)
  })

  it('[2.2-VAL-003] addUnitSchema name field has .max(200) (abuse prevention)', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators/army.ts'), 'utf-8')
    expect(validators).toMatch(/addUnitSchema[\s\S]{0,500}name[\s\S]{0,150}\.max\(200/)
  })

  it('[2.2-VAL-004] addUnitSchema has armyId field with .min(1)', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators/army.ts'), 'utf-8')
    expect(validators).toMatch(/addUnitSchema[\s\S]{0,600}armyId[\s\S]{0,100}\.min\(1/)
  })

  it('[2.2-VAL-005] addUnitSchema has type field with .min(1)', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators/army.ts'), 'utf-8')
    expect(validators).toMatch(/addUnitSchema[\s\S]{0,600}type[\s\S]{0,100}\.min\(1/)
  })

  it('[2.2-VAL-006] addUnitSchema has all 9 stat fields (m, cc, ct, f, e, pv, i, a, cd) without .min(1) (empty strings valid)', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators/army.ts'), 'utf-8')
    // All 9 stat fields must appear in addUnitSchema
    expect(validators).toMatch(/addUnitSchema[\s\S]{0,1200}[^a-z]m:[\s\S]{0,50}z\.string\(\)/)
    expect(validators).toMatch(/addUnitSchema[\s\S]{0,1200}cc:[\s\S]{0,50}z\.string\(\)/)
    expect(validators).toMatch(/addUnitSchema[\s\S]{0,1200}ct:[\s\S]{0,50}z\.string\(\)/)
    expect(validators).toMatch(/addUnitSchema[\s\S]{0,1200}[^a-z]f:[\s\S]{0,50}z\.string\(\)/)
    expect(validators).toMatch(/addUnitSchema[\s\S]{0,1200}[^a-z]e:[\s\S]{0,50}z\.string\(\)/)
    expect(validators).toMatch(/addUnitSchema[\s\S]{0,1200}pv:[\s\S]{0,50}z\.string\(\)/)
    expect(validators).toMatch(/addUnitSchema[\s\S]{0,1200}[^a-z]i:[\s\S]{0,50}z\.string\(\)/)
    expect(validators).toMatch(/addUnitSchema[\s\S]{0,1200}[^a-z]a:[\s\S]{0,50}z\.string\(\)/)
    expect(validators).toMatch(/addUnitSchema[\s\S]{0,1200}cd:[\s\S]{0,50}z\.string\(\)/)
  })

  it('[2.2-VAL-007] addUnitSchema stat fields have .max(20) (prevents accidental large text paste)', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators/army.ts'), 'utf-8')
    // At least one stat field with .max(20) inside addUnitSchema
    expect(validators).toMatch(/addUnitSchema[\s\S]{0,1500}z\.string\(\)\.max\(20\)/)
  })

  it('[2.2-VAL-008] validators/army.ts exports AddUnitInput type via z.infer', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators/army.ts'), 'utf-8')
    expect(validators).toMatch(/export type AddUnitInput\s*=\s*z\.infer/)
  })

  it('[2.2-VAL-009] validators/army.ts exports updateSubProfileSchema', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators/army.ts'), 'utf-8')
    expect(validators).toContain('export const updateSubProfileSchema')
  })

  it('[2.2-VAL-010] updateSubProfileSchema has subProfileId field with .min(1)', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators/army.ts'), 'utf-8')
    expect(validators).toMatch(/updateSubProfileSchema[\s\S]{0,400}subProfileId[\s\S]{0,100}\.min\(1/)
  })

  it('[2.2-VAL-011] updateSubProfileSchema has all 9 stat fields (m, cc, ct, f, e, pv, i, a, cd)', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators/army.ts'), 'utf-8')
    expect(validators).toMatch(/updateSubProfileSchema[\s\S]{0,1200}[^a-z]m:[\s\S]{0,50}z\.string\(\)/)
    expect(validators).toMatch(/updateSubProfileSchema[\s\S]{0,1200}cc:[\s\S]{0,50}z\.string\(\)/)
    expect(validators).toMatch(/updateSubProfileSchema[\s\S]{0,1200}cd:[\s\S]{0,50}z\.string\(\)/)
  })

  it('[2.2-VAL-012] updateSubProfileSchema stat fields have .max(20)', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators/army.ts'), 'utf-8')
    expect(validators).toMatch(/updateSubProfileSchema[\s\S]{0,1500}z\.string\(\)\.max\(20\)/)
  })

  it('[2.2-VAL-013] validators/army.ts exports UpdateSubProfileInput type via z.infer', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators/army.ts'), 'utf-8')
    expect(validators).toMatch(/export type UpdateSubProfileInput\s*=\s*z\.infer/)
  })
})

// ---------------------------------------------------------------------------
// Runtime Zod tests — addUnitSchema (Tasks 6.1–6.7)
// ---------------------------------------------------------------------------

describe('[AC1][P0] addUnitSchema runtime validation', () => {
  // Lazy import to avoid module-load failure if schema not yet exported
  const getSchema = async () => {
    const mod = await import('../../src/lib/validators')
    return mod.addUnitSchema
  }

  const validInput = {
    name: 'Guerriers du Chaos',
    type: 'Unites de base',
    armyId: 'army-uuid-123',
    m: '4',
    cc: '4',
    ct: '3',
    f: '4',
    e: '4',
    pv: '1',
    i: '4',
    a: '1',
    cd: '8',
  }

  it('[2.2-VAL-014] [Task 6.1] addUnitSchema: valid full input passes validation', async () => {
    const schema = await getSchema()
    const result = schema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('[2.2-VAL-015] [Task 6.2] addUnitSchema: empty name fails validation', async () => {
    const schema = await getSchema()
    const result = schema.safeParse({ ...validInput, name: '' })
    expect(result.success).toBe(false)
  })

  it('[2.2-VAL-016] [Task 6.7] addUnitSchema: whitespace-only name fails after trim', async () => {
    const schema = await getSchema()
    const result = schema.safeParse({ ...validInput, name: '   ' })
    expect(result.success).toBe(false)
  })

  it('[2.2-VAL-017] [Task 6.3] addUnitSchema: empty armyId fails validation', async () => {
    const schema = await getSchema()
    const result = schema.safeParse({ ...validInput, armyId: '' })
    expect(result.success).toBe(false)
  })

  it('[2.2-VAL-018] [Task 6.3] addUnitSchema: missing armyId fails validation', async () => {
    const schema = await getSchema()
    const { armyId: _omit, ...withoutArmyId } = validInput
    const result = schema.safeParse(withoutArmyId)
    expect(result.success).toBe(false)
  })

  it('[2.2-VAL-019] [Task 6.4] addUnitSchema: stat field accepts dice expression "3D6"', async () => {
    const schema = await getSchema()
    const result = schema.safeParse({ ...validInput, m: '3D6' })
    expect(result.success).toBe(true)
  })

  it('[2.2-VAL-020] [Task 6.4] addUnitSchema: stat field accepts dash "-"', async () => {
    const schema = await getSchema()
    const result = schema.safeParse({ ...validInput, m: '-' })
    expect(result.success).toBe(true)
  })

  it('[2.2-VAL-021] [Task 6.4] addUnitSchema: stat field accepts parenthesized modifier "(+1)"', async () => {
    const schema = await getSchema()
    const result = schema.safeParse({ ...validInput, cc: '(+1)' })
    expect(result.success).toBe(true)
  })

  it('[2.2-VAL-022] [Task 6.5] addUnitSchema: all stat fields accept empty string (nullable columns)', async () => {
    const schema = await getSchema()
    const allEmptyStats = { ...validInput, m: '', cc: '', ct: '', f: '', e: '', pv: '', i: '', a: '', cd: '' }
    const result = schema.safeParse(allEmptyStats)
    expect(result.success).toBe(true)
  })

  it('[2.2-VAL-023] [Task 6.6] addUnitSchema: stat field exceeding 20 chars fails validation', async () => {
    const schema = await getSchema()
    const result = schema.safeParse({ ...validInput, m: 'A'.repeat(21) })
    expect(result.success).toBe(false)
  })

  it('[2.2-VAL-024] [Task 6.6] addUnitSchema: stat field of exactly 20 chars passes validation', async () => {
    const schema = await getSchema()
    const result = schema.safeParse({ ...validInput, m: 'A'.repeat(20) })
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Runtime Zod tests — updateSubProfileSchema (Tasks 6.8–6.10)
// ---------------------------------------------------------------------------

describe('[AC2][P0] updateSubProfileSchema runtime validation', () => {
  const getSchema = async () => {
    const mod = await import('../../src/lib/validators')
    return mod.updateSubProfileSchema
  }

  const validInput = {
    subProfileId: 'sub-profile-uuid-456',
    m: '4',
    cc: '4',
    ct: '3',
    f: '4',
    e: '4',
    pv: '1',
    i: '4',
    a: '1',
    cd: '8',
  }

  it('[2.2-VAL-025] [Task 6.8] updateSubProfileSchema: valid full input passes validation', async () => {
    const schema = await getSchema()
    const result = schema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('[2.2-VAL-026] [Task 6.9] updateSubProfileSchema: empty subProfileId fails validation', async () => {
    const schema = await getSchema()
    const result = schema.safeParse({ ...validInput, subProfileId: '' })
    expect(result.success).toBe(false)
  })

  it('[2.2-VAL-027] [Task 6.9] updateSubProfileSchema: missing subProfileId fails validation', async () => {
    const schema = await getSchema()
    const { subProfileId: _omit, ...withoutId } = validInput
    const result = schema.safeParse(withoutId)
    expect(result.success).toBe(false)
  })

  it('[2.2-VAL-028] [Task 6.9] updateSubProfileSchema: all stat fields accept empty string', async () => {
    const schema = await getSchema()
    const allEmpty = { ...validInput, m: '', cc: '', ct: '', f: '', e: '', pv: '', i: '', a: '', cd: '' }
    const result = schema.safeParse(allEmpty)
    expect(result.success).toBe(true)
  })

  it('[2.2-VAL-029] [Task 6.10] updateSubProfileSchema: stat field exceeding 20 chars fails validation', async () => {
    const schema = await getSchema()
    const result = schema.safeParse({ ...validInput, cd: 'X'.repeat(21) })
    expect(result.success).toBe(false)
  })

  it('[2.2-VAL-030] [Task 6.10] updateSubProfileSchema: stat field of exactly 20 chars passes validation', async () => {
    const schema = await getSchema()
    const result = schema.safeParse({ ...validInput, cd: 'X'.repeat(20) })
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Additional low-priority tests (review fixes)
// ---------------------------------------------------------------------------

describe('[AC1][P1] addUnitSchema — additional edge cases', () => {
  const getSchema = async () => {
    const mod = await import('../../src/lib/validators')
    return mod.addUnitSchema
  }

  it('[2.2-VAL-031] addUnitSchema: empty type fails validation', async () => {
    const schema = await getSchema()
    const result = schema.safeParse({ name: 'Test', type: '', armyId: 'army-1' })
    expect(result.success).toBe(false)
  })
})
