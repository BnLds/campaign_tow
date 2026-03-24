// src/db/__tests__/queries-unit-points.test.ts
// Tech-spec: Unit Points Display & Edit
//
// Static file-contract tests for updateUnitPoints DB query function.
// Follows the pattern established in src/db/__tests__/queries-record.test.ts.

import { describe, it, expect } from 'vitest'
import { readAllQueries as getQueries } from '../../../tests/helpers/read-queries'

describe('[AC7] DB queries — updateUnitPoints', () => {
  it('exports updateUnitPoints as async function', () => {
    const queries = getQueries()
    expect(queries).toContain('export async function updateUnitPoints')
  })

  it('accepts unitId and points parameters', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateUnitPoints\s*\(unitId:\s*string,\s*points:\s*number \| null\)/)
  })

  it('returns Promise<boolean>', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateUnitPoints[\s\S]{0,200}Promise<boolean>/)
  })

  it('updates units table with set({ points })', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateUnitPoints[\s\S]{0,300}\.set\(\s*\{\s*points\s*\}/)
  })

  it('filters by unitId', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateUnitPoints[\s\S]{0,400}\.where\(eq\(units\.id,\s*unitId\)/)
  })

  it('returns true when unit found (result.length > 0)', () => {
    const queries = getQueries()
    expect(queries).toMatch(/updateUnitPoints[\s\S]{0,500}result\.length > 0/)
  })
})
