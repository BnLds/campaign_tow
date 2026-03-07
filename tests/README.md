# Campaign TOW — Test Strategy

## Philosophy

- **Simple tests only.** If a test is hard to write, the code probably needs refactoring first.
- **ATDD before each story.** Write failing acceptance tests before implementing.
- **No E2E automation for MVP.** E2E scenarios are validated manually (checklist per story).
- **Test public contracts, not internals.** Test what a function returns, not how it does it.

---

## Test Levels

| Level | Tool | Scope | When |
|---|---|---|---|
| Unit | Vitest | `src/lib/` pure functions | Every story touching `lib/` |
| Integration | Vitest | Critical server mutations + auth | Auth story + core mutations |
| E2E | Manual | Full user flows | Checklist at end of each epic |

### What gets unit tests (mandatory)

- `src/lib/owb-parser.ts` — OWB file parsing
- `src/lib/xp-calculator.ts` — XP thresholds, tier calculation
- `src/lib/delta-composer.ts` — `composeUnitView()` stat composition
- `src/lib/validators.ts` — Zod schema edge cases

### What gets integration tests (selective)

- Login / session creation server function
- Army ownership authorization middleware
- Post-match XP application mutation

### What stays manual

- All navigation / UI flows
- Visual rendering (UnitCard, TabBar, etc.)
- Full post-match happy path

---

## Directory Structure

```
src/
  lib/
    owb-parser.ts
    owb-parser.test.ts          <- co-located unit test
    xp-calculator.ts
    xp-calculator.test.ts
    delta-composer.ts
    delta-composer.test.ts
    __fixtures__/
      owb-sample.txt            <- copy of docs/army_example.txt
      unit-snapshot.ts          <- typed test data objects
tests/
  integration/
    auth.test.ts                <- login + session server functions
    army-mutations.test.ts      <- ownership checks + XP application
  README.md                     <- this file
  atdd-template.md              <- ATDD story template
```

---

## Setup (Epic 1 — Project Scaffolding)

When the TanStack Start scaffold is created, run:

```bash
# Vitest is included via TanStack Start — verify it is present:
npx @tanstack/start add vitest

# Install test utilities (if not already included):
npm install -D @vitest/ui vitest

# Run tests:
npx vitest run           # CI mode
npx vitest               # watch mode
npx vitest --ui          # browser UI
```

### `vitest.config.ts` baseline

```typescript
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      include: ['src/lib/**'],
    },
  },
})
```

### Integration test database

For integration tests that touch the DB, use a separate test PostgreSQL database:

```
TEST_DATABASE_URL=postgres://localhost:5432/campaign_tow_test
```

Use Drizzle Kit to push the schema to the test DB before the test suite runs.

---

## ATDD Workflow (per story)

1. Read the story acceptance criteria
2. Copy `tests/atdd-template.md` to `src/lib/<module>.test.ts`
3. Write failing tests that express the acceptance criteria
4. Run `npx vitest` — confirm tests are RED
5. Implement the story
6. Run `npx vitest` — confirm tests are GREEN
7. Manual E2E checklist (if applicable)

See `tests/atdd-template.md` for the test file template.
