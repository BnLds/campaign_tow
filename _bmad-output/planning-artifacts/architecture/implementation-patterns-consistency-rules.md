# Implementation Patterns & Consistency Rules

## Pattern Categories Defined

**Critical Conflict Points Identified:** 12 areas where AI agents could make different choices, now resolved with explicit patterns.

## Naming Patterns

**Database Naming Conventions:**
- Tables: `snake_case`, plural → `players`, `armies`, `units`, `sub_profiles`, `unit_deltas`
- Columns: `snake_case` → `player_id`, `army_name`, `created_at`
- Foreign keys: `<singular_table>_id` → `player_id`, `army_id`, `match_id`
- Indexes: `idx_<table>_<columns>` → `idx_units_army_id`

**Code Naming Conventions:**
- Variables / functions: `camelCase` → `getArmyById`, `currentPlayer`
- React components: `PascalCase` → `UnitCard`, `ActionChip`
- Types / interfaces: `PascalCase` → `Player`, `UnitWithDeltas`
- Constants: `UPPER_SNAKE_CASE` → `XP_THRESHOLDS_UNIT`, `MAX_TIER_LEVEL`
- Files: `kebab-case.tsx` → `unit-card.tsx`, `action-chip.tsx`
- **Explicit rule:** File names are `kebab-case`, but exports are always `PascalCase` for components and types, `camelCase` for functions.

## Structure Patterns

**Project Organization:**

```
src/
  components/
    ui/                ← shadcn primitives (Button, Input, Select, etc.)
    unit-card.tsx       ← custom domain components
    timeline-entry.tsx
    action-chip.tsx
    army-list-item.tsx
    tab-bar.tsx
    create-match-fab.tsx
    ref-table.tsx
    tier-up-screen.tsx
  db/
    schema.ts           ← Drizzle schema (all tables, single file for MVP)
    index.ts            ← DB connection + export client
    seed.ts             ← Seed script using real OWB parser + army_example.txt
  lib/
    xp-calculator.ts    ← domain logic (tiers, thresholds)
    delta-composer.ts    ← base stats + deltas composition
    owb-parser.ts       ← isolated OWB parser module
    auth.ts             ← session/cookie helpers + createMiddleware()
    validators.ts       ← Zod schemas exported from drizzle-zod
  routes/
    __root.tsx
    index.tsx            ← Campaign view
    armies/
      index.tsx          ← Army list
      $armyId.tsx        ← Army detail view
    references.tsx
    login.tsx
    match/
      new.tsx            ← Match creation
      $matchId/
        post-match.tsx   ← Post-match flow
e2e/
  login-and-browse.spec.ts
  post-match-flow.spec.ts
  cross-army-view.spec.ts
playwright.config.ts
```

**Key structural rules:**
- Server functions: co-located in route files via `createServerFn()` — NO separate `server/` directory
- Shared business logic: always in `src/lib/` — never duplicated in components or route files
- Tests: co-located for unit tests (`owb-parser.test.ts` next to `owb-parser.ts`), root-level `e2e/` for Playwright
- Test fixtures: `src/lib/__fixtures__/` for OWB sample files and test data

## Format Patterns

**Server Function Return Types:**

Mutations use a typed discriminated union:
```typescript
type ServerResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string } }

type ErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR'
```

Loaders (read operations) return data directly and throw on error — caught by React error boundary. No `ServerResult` wrapper for loaders.

**Dates:** ISO 8601 strings in DB and transit. Localized formatting only in UI layer.

## Communication Patterns

**State Management:**
- Server state: TanStack Query — single source of truth for all server data
- Local UI state: React `useState` — modal open/close, local toggles, form step tracking
- No global state store (no Zustand, no Redux)

**Cache Invalidation:**
- After mutations, invalidate relevant TanStack Query keys
- Pattern: `queryClient.invalidateQueries({ queryKey: ['armies', armyId] })`

## TanStack — Documentation Reference

TanStack libraries are in active development (RC status). ALL dev agents MUST consult up-to-date documentation before implementing any TanStack-specific pattern. **Do not rely solely on training data.**

### Step 1 — Use Claude Code Skills (preferred)

Four built-in skills provide curated TanStack guidance. **Use these first** before falling back to CLI commands:

| Skill | Scope |
|---|---|
| `/tanstack-query` | Data fetching, caching, mutations, server state management |
| `/tanstack-router` | Type-safe routing, data loading, search params, navigation |
| `/tanstack-start` | Server functions, middleware, SSR, authentication, deployment |
| `/tanstack-integration` | Integration patterns between Query + Router + Start, SSR, caching coordination |

**When to invoke a skill:**
- Before implementing any TanStack-specific pattern → invoke the relevant skill
- When uncertain about an API (server functions, middleware, loaders, routing) → invoke `/tanstack-start` or `/tanstack-router`
- When implementing data fetching or cache invalidation → invoke `/tanstack-query`
- When wiring Query + Router + Start together → invoke `/tanstack-integration`

### Step 2 — TanStack CLI Skill (fallback precision lookup)

If the four skills above don't cover the specific page or API needed, invoke the **`/tanstack-cli-docs` skill** before falling back to a web search. This skill wraps the official TanStack CLI (`npx @tanstack/cli`) and fetches exact, up-to-date documentation pages directly.

**When to use:**
- A specific guide page or API is not covered by the four skills above
- You need the exact current signature of a TanStack API
- You want to explore the TanStack ecosystem (add-ons, partners, integrations)

**Invoke:** `/tanstack-cli-docs` (describe what you are looking for)

### Step 3 — Web Search (last resort only)

Only perform a web search if both the TanStack skills (Step 1) and the `tanstack-cli-docs` skill (Step 2) have failed to answer the question. Prefer official TanStack documentation sources.

## Process Patterns

**Route Protection Patterns:**

Three session states — check via `player.isGuest` / `player.isAdmin`:
- `player.isGuest === true` → Guest (read-only, no write access)
- `player.isAdmin === true` → Admin (full access + admin section)
- otherwise → Authenticated player

Route guard rules:
- **Read-only routes** (`/`, `/armies`, `/armies/$armyId`, `/references`): Allow guest sessions. Redirect to `/login` only if no session at all.
- **Write routes** (`/match/new`, `/match/$matchId/post-match`): Require non-guest session. Redirect to `/login` if guest or no session.
- **Admin routes** (`/admin`): Require `player.isAdmin === true`. Reject otherwise.

UI rendering rules:
- Write UI elements (FAB, edit buttons, forms): absent from DOM when `player.isGuest === true`
- "Administration" link: absent from DOM unless `player.isAdmin === true`
- Identity indicator (top-left): `"Invité"` | `"Admin"` | `player.displayName`
- Session action (profile menu): `"Se déconnecter"` (player/admin) or `"Se connecter"` (guest)

Schema rule:
- `players.is_guest boolean NOT NULL DEFAULT false`
- Ghost player (`username: '__guest__'`) seeded at DB init — never appears in admin player list, never deletable
- `sessions.player_id` always `NOT NULL` — guest sessions point to the ghost player ID
- **Never** check `session === null` to determine guest status — always use `player.isGuest`

---

**Auth Middleware (TanStack Start import-protection pattern):**

`auth.ts` imports `@tanstack/react-start/server` (server-only). Referencing `authMiddleware` at module scope in a route (e.g. `.middleware([authMiddleware])`) prevents the bundler from tree-shaking `auth.ts` out of the client bundle. Solution: centralize middlewares in `src/lib/middleware.ts` using dynamic import.

```typescript
// src/lib/middleware.ts — safe to import statically in any route file
import { createMiddleware } from '@tanstack/react-start'

export const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const { getSession } = await import('./auth')  // dynamic → pruned from client bundle
  const session = await getSession()
  if (!session) throw new Error('UNAUTHORIZED')
  return next({ context: { session } })
})

export const armyOwnerMiddleware = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    // Epic 2: query armies, check army.playerId === session.playerId || isAdmin
    // throw new Error('FORBIDDEN') if check fails
    return next({ context })
  })
```

**Usage in route files:**
```typescript
import { authMiddleware } from '../lib/middleware'  // ✅ always import from middleware.ts

const myFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => { ... })
```

**Data Access in server functions:**
```typescript
// ✅ Route server functions call named functions from src/db/queries.ts
import { markPlayerWelcomeSeen } from '../db/queries'

// ❌ NEVER import db/drizzle-orm directly in a route file
// import { db } from '../db/index'        ← violation
// import { eq } from 'drizzle-orm'        ← violation
// import { players } from '../db/schema'  ← violation
```

**Validation:**
- Always validated server-side in server functions via Zod
- Client-side: TanStack Form with same Zod schema (via adapter) for immediate UX feedback
- Server is source of truth — never trust client

**Error UI:**
- Error boundary (global) for unrecoverable errors
- Toast (shadcn Sonner) for recoverable errors and success confirmations
- Loading states managed by TanStack Query (`isPending`, `isError`)

**Domain Logic:**
- Centralized in `src/lib/` — pure functions, unit-testable
- Examples: `calculateTier(xp, entityType)`, `composeStats(baseStats, deltas)`, `getAvailableImprovements(tier, entityType)`
- NEVER duplicated in components or server functions — always imported from `lib/`

## Testing Strategy

| Level | Tool | Scope | When |
|---|---|---|---|
| Unit | Vitest | `src/lib/` (XP calculator, delta composer, OWB parser) | MVP — mandatory |
| Integration | Vitest + test DB | Server functions + auth middleware | MVP — critical mutations |
| E2E | Playwright | Full user flows | MVP — 3 critical happy paths |

**E2E Scenarios (MVP):**
1. Login → browse timeline → view unit card
2. Create match → complete post-match flow (XP + tier-up + improvement)
3. Browse opponent army → view unit with campaign deltas

**Test Fixtures:**
- OWB parser: `src/lib/__fixtures__/owb-sample.txt` (from `docs/army_example.txt`)
- DB seed: `src/db/seed.ts` — uses real OWB parser to populate test data. Shared between dev and E2E setup.

**CI Pipeline (GitHub Actions):**
```
lint → typecheck → vitest → playwright
```
Sequential, fail-fast. Playwright only runs if all previous steps pass.

## Enforcement Guidelines

**All AI Agents MUST:**
- Invoke the relevant `/tanstack-*` skill before implementing any TanStack-specific pattern — never rely solely on training data
- If the four TanStack skills don't cover the needed API or guide, invoke `/tanstack-cli-docs` **before** doing any web search
- Web search is the last resort — only after both Step 1 (skills) and Step 2 (`/tanstack-cli-docs`) have been exhausted
- Follow naming conventions exactly (snake_case DB, camelCase code, PascalCase components, kebab-case files)
- Place server functions in route files, shared logic in `src/lib/`
- Use `ServerResult<T>` for mutations, direct return + throw for loaders
- Import `authMiddleware` / `armyOwnerMiddleware` from `src/lib/middleware.ts` — **never** define them locally in a route, never import from `auth.ts`
- Access the DB via named functions in `src/db/queries.ts` — **never** import `db`, `drizzle-orm`, or schema tables directly in a route file
- Import domain logic from `src/lib/` — never reimplement XP/delta/tier logic locally
- Write unit tests for any new function in `src/lib/`
