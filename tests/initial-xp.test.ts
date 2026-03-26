// tests/initial-xp.test.ts
// Initial XP Entry Flow — static file-contract tests.
// Verifies code patterns exist without a test DB.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readMatchesQueries } from './helpers/read-queries'

const root = resolve(__dirname, '..')

function getSchema() {
  return readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
}
function getEvolutionsQuery() {
  return readFileSync(resolve(root, 'src/db/queries/evolutions.ts'), 'utf-8')
}
function getIndexRoute() {
  return readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
}
function getPostMatchRoute() {
  return readFileSync(resolve(root, 'src/routes/match/$matchId/post-match.tsx'), 'utf-8')
}
function getValidators() {
  return readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')
}

// ---------------------------------------------------------------------------
// Schema — Tasks 1 & 2
// ---------------------------------------------------------------------------

describe('[INIT-SCH] Schema — matchType and needsInitialXp', () => {
  it('[INIT-SCH-001] schema exports matchTypeEnum with standard and initial_setup values', () => {
    expect(getSchema()).toMatch(/matchTypeEnum\s*=\s*pgEnum\s*\(\s*['"]match_type['"][\s\S]{0,100}initial_setup/)
  })

  it('[INIT-SCH-002] matches table has matchType column with default standard', () => {
    const schema = getSchema()
    expect(schema).toMatch(/matchType[\s\S]{0,100}matchTypeEnum[\s\S]{0,100}default\(['"]standard['"]/)
  })

  it('[INIT-SCH-003] armies table has needsInitialXp boolean column with default true', () => {
    const schema = getSchema()
    expect(schema).toMatch(/needsInitialXp[\s\S]{0,100}boolean[\s\S]{0,100}default\(true\)/)
  })
})

// ---------------------------------------------------------------------------
// Query functions — Tasks 4, 5, 7
// ---------------------------------------------------------------------------

describe('[INIT-QRY] Queries — createInitialSetupMatch', () => {
  it('[INIT-QRY-001] createInitialSetupMatch is exported from matches queries', () => {
    expect(readMatchesQueries()).toContain('export async function createInitialSetupMatch')
  })

  it('[INIT-QRY-002] createInitialSetupMatch inserts matchType initial_setup', () => {
    expect(readMatchesQueries()).toMatch(/createInitialSetupMatch[\s\S]{0,500}initial_setup/)
  })

  it('[INIT-QRY-003] createInitialSetupMatch is idempotent (returns existing if found)', () => {
    const query = readMatchesQueries()
    expect(query).toMatch(/createInitialSetupMatch[\s\S]{0,600}(existing|already|found|return)/)
  })

  it('[INIT-QRY-004] getInitialSetupMatchForArmy is exported from matches queries', () => {
    expect(readMatchesQueries()).toContain('export async function getInitialSetupMatchForArmy')
  })

  it('[INIT-QRY-005] getPendingMatches excludes initial_setup matches', () => {
    const query = readMatchesQueries()
    expect(query).toMatch(/getPendingMatches[\s\S]{0,1500}ne\(matches\.matchType,\s*['"]initial_setup['"]/)
  })

  it('[INIT-QRY-006] getTimelineForArmy uses leftJoin for opponent participant (supports initial_setup with no opponent)', () => {
    const query = readMatchesQueries()
    // Must have leftJoin on oppParticipant after the getTimelineForArmy function definition
    expect(query).toMatch(/getTimelineForArmy[\s\S]{0,1000}\.leftJoin\(oppParticipant/)
  })

  it('[INIT-QRY-007] TimelineEntryData type includes matchType field', () => {
    expect(readMatchesQueries()).toMatch(/matchType.*MatchType|MatchType.*matchType/)
  })
})

// ---------------------------------------------------------------------------
// Evolutions — Task 10
// ---------------------------------------------------------------------------

describe('[INIT-EVO] Evolutions — needsInitialXp cleared on commit', () => {
  it('[INIT-EVO-001] completeEvolutionsWithGainsTransaction accepts matchType parameter', () => {
    expect(getEvolutionsQuery()).toMatch(/completeEvolutionsWithGainsTransaction[\s\S]{0,400}matchType/)
  })

  it('[INIT-EVO-002] completeEvolutionsWithGainsTransaction clears needsInitialXp when matchType is initial_setup', () => {
    const query = getEvolutionsQuery()
    expect(query).toMatch(/initial_setup[\s\S]{0,300}needsInitialXp/)
  })
})

// ---------------------------------------------------------------------------
// Server functions — Tasks 6a, 6b, 6c, 8, 11, 14
// ---------------------------------------------------------------------------

describe('[INIT-SFN] Server functions — index.tsx', () => {
  it('[INIT-SFN-001] createInitialSetupMatchFn is defined', () => {
    expect(getIndexRoute()).toMatch(/createInitialSetupMatchFn\s*=\s*createServerFn/)
  })

  it('[INIT-SFN-002] skipInitialXpFn is defined', () => {
    expect(getIndexRoute()).toMatch(/skipInitialXpFn\s*=\s*createServerFn/)
  })

  it('[INIT-SFN-003] loadCampaignTimelineFn returns initialSetupMatch', () => {
    expect(getIndexRoute()).toMatch(/initialSetupMatch/)
  })

  it('[INIT-SFN-004] skipInitialXpFn sets needsInitialXp to false', () => {
    expect(getIndexRoute()).toMatch(/skipInitialXpFn[\s\S]{0,1000}needsInitialXp.*false|needsInitialXp.*false[\s\S]{0,500}skipInitialXpFn/)
  })
})

describe('[INIT-SFN] Server functions — post-match.tsx', () => {
  it('[INIT-SFN-005] loadPostMatchDataFn returns mode field', () => {
    expect(getPostMatchRoute()).toMatch(/mode.*initial-xp|initial-xp.*mode/)
  })

  it('[INIT-SFN-006] submitUnitXpFn uses submitInitialXpSchema as input validator', () => {
    expect(getPostMatchRoute()).toMatch(/submitUnitXpFn[\s\S]{0,600}inputValidator[\s\S]{0,200}submitInitialXpSchema/)
  })

  it('[INIT-SFN-007] submitUnitXpFn enforces max 200 for standard matches server-side', () => {
    const route = getPostMatchRoute()
    expect(route).toMatch(/standard.*xpGained.*200|xpGained.*200.*standard/)
  })

  it('[INIT-SFN-008] completeEvolutionsWithGainsFn reads matchType server-side', () => {
    const route = getPostMatchRoute()
    expect(route).toMatch(/resolvedMatchType|matchType[\s\S]{0,300}matchesTable/)
  })
})

// ---------------------------------------------------------------------------
// Validators — Task 14
// ---------------------------------------------------------------------------

describe('[INIT-VAL] Validators — submitInitialXpSchema', () => {
  it('[INIT-VAL-001] submitInitialXpSchema is exported from validators.ts', () => {
    expect(getValidators()).toContain('export const submitInitialXpSchema')
  })

  it('[INIT-VAL-002] submitInitialXpSchema allows xpGained up to 200', () => {
    expect(getValidators()).toMatch(/submitInitialXpSchema[\s\S]{0,200}max\(200\)/)
  })

  it('[INIT-VAL-003] submitUnitXpSchema still enforces max 99 (unchanged)', () => {
    expect(getValidators()).toMatch(/submitUnitXpSchema[\s\S]{0,200}max\(99\)/)
  })
})
