// tests/pertes-catastrophiques-points.test.ts
// Pertes Catastrophiques: points halving in SQL totals
//
// Static file-contract tests verifying that getUnitsTotalsByIds,
// getArmyXpAndPointsTotalsBatch, and submitUnitSelection all account
// for active pertes_catastrophiques gains when computing totalPoints.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')

function getUnitsQueries() {
  return readFileSync(resolve(root, 'src/db/queries/units.ts'), 'utf-8')
}

function getUnitSelectionsQueries() {
  return readFileSync(resolve(root, 'src/db/queries/matches/unit-selections.ts'), 'utf-8')
}

// ---------------------------------------------------------------------------
// getUnitsTotalsByIds — halves points for units with active pertes_catastrophiques
// ---------------------------------------------------------------------------

describe('getUnitsTotalsByIds — pertes_catastrophiques points halving', () => {
  it('uses EXISTS subquery on unitGains for pertes_catastrophiques', () => {
    const code = getUnitsQueries()
    // Drizzle template: ${unitGains} interpolation, so match on the JS source pattern
    expect(code).toMatch(/getUnitsTotalsByIds[\s\S]*?EXISTS[\s\S]*?pertes_catastrophiques[\s\S]*?FLOOR[\s\S]*?points[\s\S]*?\/\s*2/)
  })

  it('checks cleared = false to only affect active gains', () => {
    const code = getUnitsQueries()
    expect(code).toMatch(/getUnitsTotalsByIds[\s\S]*?cleared[\s\S]*?false/)
  })
})

// ---------------------------------------------------------------------------
// getArmyXpAndPointsTotalsBatch — halves points for units with active pertes_catastrophiques
// ---------------------------------------------------------------------------

describe('getArmyXpAndPointsTotalsBatch — pertes_catastrophiques points halving', () => {
  it('uses EXISTS subquery on unitGains for pertes_catastrophiques', () => {
    const code = getUnitsQueries()
    expect(code).toMatch(/getArmyXpAndPointsTotalsBatch[\s\S]*?EXISTS[\s\S]*?pertes_catastrophiques[\s\S]*?FLOOR[\s\S]*?points[\s\S]*?\/\s*2/)
  })
})

// ---------------------------------------------------------------------------
// submitUnitSelection — halves points for units with active pertes_catastrophiques
// ---------------------------------------------------------------------------

describe('submitUnitSelection — pertes_catastrophiques points halving', () => {
  it('uses EXISTS subquery on unitGains for pertes_catastrophiques', () => {
    const code = getUnitSelectionsQueries()
    expect(code).toMatch(/EXISTS[\s\S]*?pertes_catastrophiques[\s\S]*?FLOOR[\s\S]*?points[\s\S]*?\/\s*2/)
  })

  it('imports unitGains from schema', () => {
    const code = getUnitSelectionsQueries()
    expect(code).toMatch(/import.*unitGains.*from/)
  })
})

// ---------------------------------------------------------------------------
// unit-destruction-step — rule text includes points halving
// ---------------------------------------------------------------------------

describe('UnitDestructionStep — rule text mentions points halving', () => {
  it('pertes_catastrophiques ruleText mentions point value halving', () => {
    const code = readFileSync(resolve(root, 'src/components/unit-destruction-step.tsx'), 'utf-8')
    expect(code).toMatch(/pertes_catastrophiques[\s\S]*?points/)
  })
})

// ---------------------------------------------------------------------------
// evolutions — DB description mentions points
// ---------------------------------------------------------------------------

describe('processConsequences — pertes_catastrophiques description includes points', () => {
  it('gain description mentions points', () => {
    const code = readFileSync(resolve(root, 'src/db/queries/evolutions.ts'), 'utf-8')
    expect(code).toMatch(/Pertes Catastrophiques.*points/)
  })
})

// ---------------------------------------------------------------------------
// loadArmyFn — computes effectivePoints server-side
// ---------------------------------------------------------------------------

describe('loadArmyFn — effectivePoints computation', () => {
  function getUnitQueries() {
    return readFileSync(resolve(root, 'src/server-fns/unit-queries.ts'), 'utf-8')
  }

  it('contains effectivePoints in the unit object returned by loadArmyFn', () => {
    const code = getUnitQueries()
    expect(code).toMatch(/loadArmyFn[\s\S]*?effectivePoints/)
  })

  it('assigns effectivePoints based on pertes_catastrophiques gain presence', () => {
    const code = getUnitQueries()
    expect(code).toMatch(/pertes_catastrophiques[\s\S]*?effectivePoints/)
  })

  it('includes effectivePoints in the unit card shape passed to the client', () => {
    const code = getUnitQueries()
    // The unit object literal must include effectivePoints as a key
    expect(code).toMatch(/unit:\s*\{[^}]*effectivePoints[^}]*\}/)
  })
})

// ---------------------------------------------------------------------------
// loadArmyUnitsForSelectionFn — computes effectivePoints server-side
// ---------------------------------------------------------------------------

describe('loadArmyUnitsForSelectionFn — effectivePoints computation', () => {
  function getIndexRoute() {
    return readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
  }

  it('contains effectivePoints in loadArmyUnitsForSelectionFn', () => {
    const code = getIndexRoute()
    expect(code).toMatch(/loadArmyUnitsForSelectionFn[\s\S]*?effectivePoints/)
  })

  it('computes effectivePoints with Math.floor halving for pertes_catastrophiques', () => {
    const code = getIndexRoute()
    // pertesCataIds usage appears before effectivePoints assignment; Math.floor on the same line
    expect(code).toMatch(/pertes[\s\S]{0,400}effectivePoints[\s\S]{0,200}Math\.floor/)
  })

  it('includes effectivePoints in the return type annotation', () => {
    const code = getIndexRoute()
    expect(code).toMatch(/loadArmyUnitsForSelectionFn[\s\S]*?effectivePoints:\s*number/)
  })
})
