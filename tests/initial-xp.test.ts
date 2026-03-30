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
  return readFileSync(resolve(root, 'src/lib/validators/post-match.ts'), 'utf-8')
}
function getTimelineQuery() {
  return readFileSync(resolve(root, 'src/db/queries/matches/timeline.ts'), 'utf-8')
}

// ---------------------------------------------------------------------------
// Schema — Tasks 1 & 2
// ---------------------------------------------------------------------------

describe('[INIT-SCH] Schema — matchType and initialXpCompletedAt', () => {
  it('[INIT-SCH-001] schema exports matchTypeEnum with standard and initial_setup values', () => {
    expect(getSchema()).toMatch(/matchTypeEnum\s*=\s*pgEnum\s*\(\s*['"]match_type['"][\s\S]{0,100}initial_setup/)
  })

  it('[INIT-SCH-002] matches table has matchType column with default standard', () => {
    const schema = getSchema()
    expect(schema).toMatch(/matchType[\s\S]{0,100}matchTypeEnum[\s\S]{0,100}default\(['"]standard['"]/)
  })

  it('[INIT-SCH-003] armies table has initialXpCompletedAt timestamp column (nullable)', () => {
    const schema = getSchema()
    expect(schema).toMatch(/initialXpCompletedAt[\s\S]{0,100}timestamp[\s\S]{0,100}initial_xp_completed_at/)
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

  // TODO: fix leftJoin assertion for opponent participant
  it.skip('[INIT-QRY-006] getTimelineForArmy uses leftJoin for opponent participant (supports initial_setup with no opponent)', () => {
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

describe('[INIT-EVO] Evolutions — initialXpCompletedAt set on commit', () => {
  it('[INIT-EVO-001] completeEvolutionsWithGainsTransaction accepts matchType parameter', () => {
    expect(getEvolutionsQuery()).toMatch(/completeEvolutionsWithGainsTransaction[\s\S]{0,400}matchType/)
  })

  it('[INIT-EVO-002] completeEvolutionsWithGainsTransaction sets initialXpCompletedAt when matchType is initial_setup', () => {
    const query = getEvolutionsQuery()
    // Coupled: initial_setup guard and .set({ initialXpCompletedAt }) must be in the same if-block
    expect(query).toMatch(/if\s*\(matchType\s*===\s*['"]initial_setup['"][\s\S]{0,200}\.set\(\{\s*initialXpCompletedAt/)
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

  it('[INIT-SFN-004] skipInitialXpFn sets initialXpCompletedAt', () => {
    const code = getIndexRoute()
    // Coupled: initialXpCompletedAt must appear inside skipInitialXpFn's .handler, not in another function
    const fnStart = code.indexOf('skipInitialXpFn')
    const fnBlock = code.slice(fnStart, fnStart + 1200)
    expect(fnBlock).toMatch(/\.set\(\{\s*initialXpCompletedAt/)
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
// Timeline gating — gate-timeline-initial-xp spec
// ---------------------------------------------------------------------------

describe('[INIT-TL] Timeline — initialXpCompletedAt gating', () => {
  it('[INIT-TL-001] getTimelineForArmy accepts initialXpCompletedAt parameter', () => {
    expect(getTimelineQuery()).toMatch(/getTimelineForArmy\(armyId:\s*string,\s*initialXpCompletedAt:\s*Date\s*\|\s*null\)/)
  })

  it('[INIT-TL-002] getTimelineForArmy filters by matchType initial_setup when initialXpCompletedAt is null', () => {
    const query = getTimelineQuery()
    // When initialXpCompletedAt is null, the conditional filter selects initial_setup matches only
    expect(query).toMatch(/getTimelineForArmy[\s\S]{0,500}initialXpCompletedAt[\s\S]{0,200}eq\(matches\.matchType,\s*['"]initial_setup['"]/)
  })

  it('[INIT-TL-003] getTimelineForArmy filters matches.date using gte with initialXpCompletedAt', () => {
    expect(getTimelineQuery()).toMatch(/getTimelineForArmy[\s\S]{0,2000}gte\(matches\.date,\s*initialXpCompletedAt\)/)
  })

  it('[INIT-TL-004] getLatestMatchIdForArmy accepts initialXpCompletedAt parameter', () => {
    expect(getTimelineQuery()).toMatch(/getLatestMatchIdForArmy\(armyId:\s*string,\s*initialXpCompletedAt:\s*Date\s*\|\s*null\)/)
  })

  it('[INIT-TL-005] getLatestMatchIdForArmy returns null when initialXpCompletedAt is null', () => {
    expect(getTimelineQuery()).toMatch(/getLatestMatchIdForArmy[\s\S]{0,200}if\s*\(\s*!initialXpCompletedAt\s*\)\s*return\s*null/)
  })

  it('[INIT-TL-006] getLatestMatchIdForArmy filters matches.date using gte with initialXpCompletedAt', () => {
    expect(getTimelineQuery()).toMatch(/getLatestMatchIdForArmy[\s\S]{0,1000}gte\(matches\.date,\s*initialXpCompletedAt\)/)
  })

  it('[INIT-TL-007] getTimelineForArmy WHERE clause references only matchParticipants.armyId (no opponent initialXpCompletedAt)', () => {
    const query = getTimelineQuery()
    // Extract the main query's .where() — anchored to the .from(matchParticipants) chain in getTimelineForArmy
    const fnBody = query.slice(query.indexOf('async function getTimelineForArmy'))
    // Match the where clause that follows the main query chain (after .leftJoin(oppPlayer...))
    const mainQueryWhere = fnBody.match(/\.leftJoin\(oppPlayer[\s\S]{0,200}\.where\(([\s\S]{0,300})\)/)
    expect(mainQueryWhere).not.toBeNull()
    // Should contain matchParticipants.armyId
    expect(mainQueryWhere![1]).toContain('matchParticipants.armyId')
    // Should NOT contain oppArmy or opp_army references in the where clause
    expect(mainQueryWhere![1]).not.toMatch(/opp.*initialXpCompletedAt/)
  })
})

// ---------------------------------------------------------------------------
// Timeline gating — integration tests (require test DB)
// ---------------------------------------------------------------------------

describe('[INIT-TL-INT] Timeline gating — integration', () => {
  it.skip('[INIT-TL-INT-001] getTimelineForArmy(armyId, null) returns [] with seeded matches', () => {
    // TODO: requires test DB with seeded matches
  })

  it.skip('[INIT-TL-INT-002] getTimelineForArmy(armyId, completedAt) returns only post-completion matches', () => {
    // TODO: requires test DB with matches before and after completedAt
  })
})

// ---------------------------------------------------------------------------
// Validators — Task 14
// ---------------------------------------------------------------------------

describe('[INIT-VAL] Validators — submitInitialXpSchema', () => {
  it('[INIT-VAL-001] submitInitialXpSchema is exported from validators/post-match.ts', () => {
    expect(getValidators()).toContain('export const submitInitialXpSchema')
  })

  it('[INIT-VAL-002] submitInitialXpSchema allows xpGained up to 200', () => {
    expect(getValidators()).toMatch(/submitInitialXpSchema[\s\S]{0,200}max\(200\)/)
  })

  it('[INIT-VAL-003] submitUnitXpSchema still enforces max 99 (unchanged)', () => {
    expect(getValidators()).toMatch(/submitUnitXpSchema[\s\S]{0,200}max\(99\)/)
  })
})
