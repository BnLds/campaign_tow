# ATDD Template — Story [STORY-ID]: [Story Title]

Copy this file to the appropriate location (co-located unit test or `tests/integration/`)
and replace all `[PLACEHOLDER]` sections before starting implementation.

---

## Acceptance Criteria (from story)

<!-- Copy verbatim from the story file -->
- AC1: [...]
- AC2: [...]
- AC3: [...]

---

## Test File

```typescript
// src/lib/[module].test.ts
// Story [STORY-ID]: [Story Title]
// Status: RED (write before implementing)

import { describe, it, expect, beforeEach } from 'vitest'
// import { functionUnderTest } from './[module]'

// ---------------------------------------------------------------------------
// Test data / fixtures
// ---------------------------------------------------------------------------

const FIXTURE_[NAME] = {
  // Minimal, realistic test data
} as const

// ---------------------------------------------------------------------------
// [Module / Feature name]
// ---------------------------------------------------------------------------

describe('[module or feature]', () => {

  // AC1: [acceptance criterion text]
  it('[should do X when Y]', () => {
    // Arrange
    const input = FIXTURE_[NAME]

    // Act
    // const result = functionUnderTest(input)

    // Assert
    // expect(result).toEqual(expectedValue)
    expect(true).toBe(false) // RED — remove when implementing
  })

  // AC2: [acceptance criterion text]
  it('[should handle edge case Z]', () => {
    // Arrange

    // Act

    // Assert
    expect(true).toBe(false) // RED — remove when implementing
  })

})
```

---

## Integration Test File (if server function / auth involved)

```typescript
// tests/integration/[feature].test.ts
// Story [STORY-ID]: [Story Title]

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../../src/db'

beforeAll(async () => {
  // Seed minimal test data
})

afterAll(async () => {
  // Clean up test data
})

describe('[server function name]', () => {

  it('[returns success when authorized]', async () => {
    // Arrange
    const session = { playerId: 1, isAdmin: false }

    // Act
    // const result = await serverFunction({ ... }, session)

    // Assert
    // expect(result.success).toBe(true)
    expect(true).toBe(false) // RED
  })

  it('[returns FORBIDDEN when not the army owner]', async () => {
    expect(true).toBe(false) // RED
  })

})
```

---

## Manual E2E Checklist (complete after implementation)

- [ ] [User-visible behavior 1]
- [ ] [User-visible behavior 2]
- [ ] [Edge case / error state visible in UI]

---

## Implementation Notes

<!-- Fill in during implementation if anything deviates from expected -->
