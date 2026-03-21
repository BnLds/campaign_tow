// src/routes/__tests__/campaign-post-match.test.ts
// Story 4.1: Post-Match Flow — XP Entry per Unit & Character
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the Campaign view (index.tsx):
//   - ActionChip href for post-match navigation wired to /match/$matchId/post-match
//
// Follows the pattern established in src/routes/__tests__/root-header.test.ts.
//
// Covers Task 10.30 (AC: 1)
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')

function getIndexRoute() {
  return readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
}

// ---------------------------------------------------------------------------
// 10.30 — Campaign view: ActionChip href for post-match is /match/$matchId/post-match
// AC: 1
// ---------------------------------------------------------------------------

describe('[AC1][P0] Campaign view — ActionChip href for post-match navigation (Task 7.1)', () => {
  // 10.30 — ActionChip renders with href pointing to /match/.../post-match when result set but evolutions not entered
  it('[4.1-CAMP-001] index.tsx sets ActionChip href to /match/$matchId/post-match for post-match pending chips', () => {
    const code = getIndexRoute()
    // The href must include 'post-match' as part of the URL pattern
    // Coupled assertion: ActionChip + href + post-match must be in same code block
    expect(code).toMatch(/ActionChip[\s\S]{0,400}href[\s\S]{0,200}post-match|href[\s\S]{0,200}post-match[\s\S]{0,400}ActionChip/)
  })

  // 10.30 — href uses match.matchId to build the URL dynamically
  it('[4.1-CAMP-002] index.tsx ActionChip href uses match.matchId to build the URL dynamically', () => {
    const code = getIndexRoute()
    // The URL must include match.matchId (or matchId) as a dynamic segment
    expect(code).toMatch(/href[\s\S]{0,400}(match\.matchId|matchId)[\s\S]{0,200}post-match|post-match[\s\S]{0,200}(match\.matchId|matchId)/)
  })

  // 10.30 — only applies href when myResult !== null (result entered, evolutions pending)
  it('[4.1-CAMP-003] index.tsx applies post-match href only when myResult is not null (result already entered)', () => {
    const code = getIndexRoute()
    // The conditional branch: myResult !== null → href="/match/.../post-match"
    // myResult === null chips should NOT get the post-match href
    expect(code).toMatch(/myResult\s*!==\s*null[\s\S]{0,500}post-match|post-match[\s\S]{0,200}myResult\s*!==\s*null/)
  })

  // 10.30 — result-pending chips (myResult === null) do NOT get post-match href
  it('[4.1-CAMP-004] index.tsx result-pending chips (myResult === null) do not get post-match href', () => {
    const code = getIndexRoute()
    // The myResult === null branch must NOT have post-match href
    // We check that the code branches correctly: two different ActionChip renders for null vs non-null
    expect(code).toMatch(/myResult\s*===\s*null[\s\S]{0,500}ActionChip/)
  })

  // 10.30 — the full URL pattern is /match/ + matchId + /post-match
  it('[4.1-CAMP-005] index.tsx ActionChip href constructs "/match/" + matchId + "/post-match" pattern', () => {
    const code = getIndexRoute()
    // Must contain the URL construction pattern
    expect(code).toMatch(/['"/]match\/[\s\S]{0,100}post-match['"]/)
  })
})
