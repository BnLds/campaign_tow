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
  // 10.30 — href uses match.matchId to build the URL dynamically
  it('[4.1-CAMP-002] index.tsx ActionChip href uses match.matchId to build the URL dynamically', () => {
    const code = getIndexRoute()
    // The URL must include match.matchId (or matchId) as a dynamic segment
    expect(code).toMatch(/href[\s\S]{0,400}(match\.matchId|matchId)[\s\S]{0,200}post-match|post-match[\s\S]{0,200}(match\.matchId|matchId)/)
  })

  // 10.30 — the full URL pattern is /match/ + matchId + /post-match
  it('[4.1-CAMP-005] index.tsx ActionChip href constructs "/match/" + matchId + "/post-match" pattern', () => {
    const code = getIndexRoute()
    // Must contain the URL construction pattern
    expect(code).toMatch(/['"/]match\/[\s\S]{0,100}post-match['"]/)
  })
})
