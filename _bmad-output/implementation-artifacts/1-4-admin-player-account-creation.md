# Story 1.4: Admin — Player Account Creation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Ben (admin),
I want to create player accounts,
so that all campaign participants can log in with their own credentials.

## Acceptance Criteria

**AC1 — Admin sees create-player form:**
Given I am logged in as admin (isAdmin = true),
When I navigate to the admin section,
Then I see a form to create a new player account.

**AC2 — Player record created with hashed password:**
Given I am on the create player form,
When I enter a valid username and temporary password and submit,
Then a new player record is created with isAdmin = false, displayName = username, hasSeenWelcome = false, and a bcrypt-hashed password stored in `players.passwordHash`.

**AC3 — Newly created player can log in and sees WelcomeModal:**
Given a newly created player account,
When that player logs in with the temporary credentials,
Then they can access the app and the WelcomeModal appears prompting them to update their display name.

**AC4 — Non-admin access denied:**
Given I am logged in as a non-admin player,
When I attempt to access the admin section,
Then I am denied access (redirect to `/` or 403).

**AC5 — Duplicate username rejected:**
Given I attempt to create a player with a username that already exists,
Then a validation error is shown and no duplicate account is created.

## Tasks / Subtasks

- [ ] Task 1 — Create `adminMiddleware` in `src/lib/middleware.ts` (AC4)
  - [ ] Chain `authMiddleware`, then check `context.session.isAdmin === true`
  - [ ] Throw `new Error('FORBIDDEN')` if not admin
  - [ ] Export alongside existing `authMiddleware` and `armyOwnerMiddleware`
  - [ ] Update `src/lib/auth.test.ts` to verify `adminMiddleware` is exported from `middleware.ts`

- [ ] Task 2 — Add `createPlayerSchema` to `src/lib/validators.ts` (AC2, AC5)
  - [ ] Export `createPlayerSchema`: `z.object({ username: z.string().trim().min(2, '...').max(50, '...'), tempPassword: z.string().min(6, '...').max(100, '...') })`
  - [ ] Export `CreatePlayerInput` type
  - [ ] Update `src/lib/validators.test.ts`: add tests for valid input, empty username, short username, short password, max length violations

- [ ] Task 3 — Add `createPlayer()` to `src/db/queries.ts` (AC2, AC5)
  - [ ] Function signature: `createPlayer(username: string, passwordHash: string): Promise<{ id: string; username: string; displayName: string }>`
  - [ ] Insert into `players` with `isAdmin: false`, `hasSeenWelcome: false`, `displayName: username`
  - [ ] Return the created player record (id, username, displayName)
  - [ ] **Do NOT hash password in queries.ts** — hashing happens in the server function handler

- [ ] Task 4 — Add `checkUsernameExists()` to `src/db/queries.ts` (AC5)
  - [ ] Function signature: `checkUsernameExists(username: string): Promise<boolean>`
  - [ ] Query `players` table with `eq(players.username, username)`
  - [ ] Return `true` if exists, `false` otherwise

- [ ] Task 5 — Create admin route `src/routes/admin/index.tsx` (AC1, AC4)
  - [ ] File-based route: `/admin`
  - [ ] `beforeLoad` hook: check `context.session.isAdmin === true`, redirect to `/` if not admin (AC4)
  - [ ] `createPlayerFn` server function:
    - `.middleware([adminMiddleware])` — import from `src/lib/middleware.ts`
    - `.validator(createPlayerSchema)` — **VERIFY API**: run `npx @tanstack/cli search-docs "createServerFn validator" --library start --framework react` before implementing
    - `.handler()`: check `checkUsernameExists()`, if exists return `ServerResult` error with `code: 'VALIDATION_ERROR'`; otherwise `bcryptjs.hash(data.tempPassword, 12)`, then `createPlayer(data.username, hash)`, return `ServerResult<{ id, username, displayName }>`
  - [ ] Render create-player form using TanStack Form + `createPlayerSchema`
  - [ ] Display success message with created username after submission
  - [ ] Display validation error for duplicate username (AC5)
  - [ ] Display server errors clearly
  - [ ] Style with Campaign TOW design tokens (see Dev Notes — UX section)

- [ ] Task 6 — Add navigation link to admin section (AC1)
  - [ ] In `src/routes/index.tsx` (Campaign view): if `session?.isAdmin === true`, show a discreet admin link/button navigating to `/admin`
  - [ ] **Do NOT add admin to TabBar** — admin is not a primary nav destination; it's a utility link visible only to admin

- [ ] Task 7 — Write tests (AC1–AC5)
  - [ ] `src/lib/validators.test.ts`: tests for `createPlayerSchema` (valid, empty username, short username, short password, max length)
  - [ ] `tests/integration/admin.test.ts`: integration tests covering:
    - Admin route file exists and exports `Route`
    - `createPlayerFn` exists with `adminMiddleware`
    - `adminMiddleware` chains `authMiddleware` and checks `isAdmin`
    - `createPlayerSchema` validates correctly
    - `checkUsernameExists` and `createPlayer` exist in `queries.ts`
    - Password hashing uses `bcryptjs` in handler (not in queries.ts)
    - `beforeLoad` redirect for non-admin users
  - [ ] `pnpm test` passes: all existing tests (93 baseline) + new tests

- [ ] Task 8 — Verify quality gates
  - [ ] `pnpm typecheck` — zero errors
  - [ ] `pnpm lint` — zero errors
  - [ ] `pnpm build` — succeeds

## Dev Notes

### Admin Middleware — New in `src/lib/middleware.ts`

```typescript
// src/lib/middleware.ts — ADD this after existing authMiddleware and armyOwnerMiddleware
export const adminMiddleware = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    if (!context.session.isAdmin) {
      throw new Error('FORBIDDEN')
    }
    return next({ context })
  })
```

**Key:** `adminMiddleware` chains `authMiddleware` — so `context.session` is already populated. No need to re-check authentication.

**Import-protection:** `adminMiddleware` uses the same pattern as `authMiddleware` — it's defined in `middleware.ts` using `createMiddleware`, safe to import statically in any route file.

### Validator — `createPlayerSchema`

Add to `src/lib/validators.ts` (client-safe, pure Zod):
```typescript
// Admin — Create player account (story 1.4)
export const createPlayerSchema = z.object({
  username: z.string()
    .trim()
    .min(2, 'Username must be at least 2 characters')
    .max(50, 'Username must be 50 characters or less'),
  tempPassword: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be 100 characters or less'),
})
export type CreatePlayerInput = z.infer<typeof createPlayerSchema>
```

**Why `tempPassword` not `password`?** Semantic clarity — the admin creates a temporary password, the player can change it later (post-MVP). Min 6 is sufficient for a closed group of ~15 players where the admin personally distributes credentials.

**Note:** `trim()` on username prevents accidental whitespace issues. No `trim()` on password — spaces in passwords are intentional.

### DB Queries — `createPlayer` and `checkUsernameExists`

Add to `src/db/queries.ts`:
```typescript
import { eq } from 'drizzle-orm'
import { db } from './index'
import { players } from './schema'

export async function checkUsernameExists(username: string): Promise<boolean> {
  const existing = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.username, username))
    .limit(1)
  return existing.length > 0
}

export async function createPlayer(
  username: string,
  passwordHash: string,
): Promise<{ id: string; username: string; displayName: string }> {
  const [player] = await db
    .insert(players)
    .values({
      username,
      passwordHash,
      displayName: username, // Default displayName = username until player changes it
      isAdmin: false,
      hasSeenWelcome: false,
    })
    .returning({ id: players.id, username: players.username, displayName: players.displayName })
  return player
}
```

**Critical:** Password hashing happens in the server function handler, NOT in `queries.ts`. The query receives an already-hashed string. This keeps `queries.ts` as a pure data access layer with no side effects.

### Admin Route — `src/routes/admin/index.tsx`

**Route protection (AC4) — `beforeLoad` hook:**
```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/')({
  beforeLoad: ({ context }) => {
    if (!context.session?.isAdmin) {
      throw redirect({ to: '/' })
    }
  },
  component: AdminPage,
})
```

**Server function — `createPlayerFn`:**
```typescript
import { createServerFn } from '@tanstack/react-start'
import { adminMiddleware } from '../../lib/middleware'
import { createPlayerSchema } from '../../lib/validators'
import type { ServerResult } from '../../lib/types'

const createPlayerFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator(createPlayerSchema)  // ⚠️ VERIFY: may be .inputValidator() — search-docs first!
  .handler(async ({ context, data }): Promise<ServerResult<{ id: string; username: string; displayName: string }>> => {
    const { checkUsernameExists, createPlayer } = await import('../../db/queries')
    const bcryptjs = await import('bcryptjs')

    // AC5 — Duplicate username check
    const exists = await checkUsernameExists(data.username)
    if (exists) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Ce nom d\'utilisateur existe déjà' },
      }
    }

    // AC2 — Hash password and create player
    const passwordHash = await bcryptjs.hash(data.tempPassword, 12)
    const player = await createPlayer(data.username, passwordHash)

    return { success: true, data: player }
  })
```

**MANDATORY before implementing:** Verify the correct API for input validation on `createServerFn`:
```bash
npx @tanstack/cli search-docs "createServerFn validator inputValidator" --library start --framework react
```
Story 1.2/1.3 used `.inputValidator()` — but the API may have changed. Always check docs.

**Dynamic imports in handler:** `bcryptjs` and `queries.ts` are imported dynamically inside the handler to keep them server-only. This follows the import-protection pattern.

### Admin Page Component

```typescript
function AdminPage() {
  const [createdPlayer, setCreatedPlayer] = useState<{ username: string } | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { username: '', tempPassword: '' },
    validators: { onSubmit: createPlayerSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const result = await createPlayerFn({ data: value })
      if (result.success) {
        setCreatedPlayer({ username: result.data.username })
        form.reset()
      } else {
        setServerError(result.error.message)
      }
    },
  })

  return (
    <main style={{ padding: '1.5rem', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand)', marginBottom: '1.5rem' }}>
        Administration
      </h1>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        Créer un compte joueur
      </h2>

      {createdPlayer && (
        <div style={{ background: 'var(--color-bonus-bg)', border: '1px solid var(--color-bonus)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          Compte créé pour <strong>{createdPlayer.username}</strong>. Le joueur peut maintenant se connecter.
        </div>
      )}

      {serverError && (
        <div style={{ background: 'var(--color-malus-bg)', border: '1px solid var(--color-malus)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--color-malus)' }}>
          {serverError}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
        {/* username field + tempPassword field + submit button */}
        {/* Follow same pattern as WelcomeModal in src/components/welcome-modal.tsx */}
      </form>
    </main>
  )
}
```

### UX Design Tokens (apply throughout)

- Background: `var(--color-bg)` (#f1eade)
- Surface: `var(--color-surface)` (#fffbf5)
- Title font: `var(--font-display)` (Cinzel)
- Brand color: `var(--color-brand)` (#334155)
- Error/malus: `var(--color-malus)` (#b82c2c) / bg `var(--color-malus-bg)` (#fdf0f0)
- Success/bonus: `var(--color-bonus)` (#2d7a3a) / bg `var(--color-bonus-bg)` (#edf8ef)
- Input/Button: shadcn `<Input>`, `<Button>`, `<Label>` from `src/components/ui/`

### Navigation to Admin

In `src/routes/index.tsx`, add a discreet link visible only to admin:
```typescript
{session?.isAdmin && (
  <Link to="/admin" style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
    Administration
  </Link>
)}
```

**Important:** This is NOT a tab in the TabBar. The TabBar has exactly 3 tabs (Campagne, Armées, Références) — never more. The admin link is a contextual utility link on the Campaign view only.

### Password Hashing — bcryptjs Pattern

```typescript
import bcryptjs from 'bcryptjs'

// In createPlayerFn handler:
const passwordHash = await bcryptjs.hash(data.tempPassword, 12) // 12 rounds, consistent with seed-admin.ts
```

**Critical:** `bcryptjs` (not `bcrypt`) is the dependency installed in this project (pure JS, no native compilation). Verify with:
```bash
grep bcryptjs package.json
```

`seed-admin.ts` already uses `bcryptjs` with 12 rounds — maintain consistency.

### Route Structure After Story 1.4

```
src/routes/
├── __root.tsx             ← unchanged
├── index.tsx              ← MODIFIED: add admin link if isAdmin
├── login.tsx              ← unchanged
├── admin/
│   └── index.tsx          ← NEW: admin page with create-player form (AC1, AC2, AC4, AC5)
├── armies/
│   ├── index.tsx          ← (future)
│   └── $armyId.tsx        ← (future)
├── match/
│   ├── new.tsx            ← (future)
│   └── $matchId/
│       └── post-match.tsx ← (future)
└── references.tsx         ← (future)
```

### Architecture Boundaries — Compliance Checklist

- [ ] `adminMiddleware` defined in `src/lib/middleware.ts` — NOT locally in route file
- [ ] `adminMiddleware` chains `authMiddleware` — never reads cookies directly
- [ ] Password hashing in server function handler — NOT in `queries.ts`
- [ ] DB access via `src/db/queries.ts` named functions — NOT direct `db` import in route
- [ ] `createPlayerSchema` in `src/lib/validators.ts` (client-safe, pure Zod)
- [ ] `ServerResult<T>` return type from `src/lib/types.ts`
- [ ] Admin link NOT added to TabBar — utility link on Campaign view only
- [ ] `beforeLoad` in admin route redirects non-admin to `/`

### Previous Story Learnings (from Stories 1.2 & 1.3)

- **Cookie API:** `getCookie`, `setCookie`, `deleteCookie` from `@tanstack/react-start/server`
- **createServerFn:** `.inputValidator()` not `.validator()` — always verify with `search-docs` before implementing. The API name has been inconsistent across TanStack Start versions.
- **Import-protection pattern:** Server-only imports (`auth.ts`, `bcryptjs`, `queries.ts`) must be dynamically imported inside `.handler()` or `.server()` callbacks — never at module level in a route file if they pull in server-only packages.
- **TanStack Form + Zod v4:** Native Standard Schema support — no `@tanstack/zod-form-adapter`. Pattern: `useForm({ validators: { onSubmit: myZodSchema } })`
- **Error field access in TanStack Form:** `field.state.meta.errors[0]?.message` — verify path for Zod v4 errors
- **Middleware export from story 1.3:** `authMiddleware` is in `src/lib/middleware.ts` (moved from local definition in route files during code review)
- **DB queries pattern from story 1.3:** All DB access via named functions in `src/db/queries.ts` (established during code review — `markPlayerWelcomeSeen`, `updatePlayerDisplayName`)
- **Test baseline:** 93 tests passing post-story-1.3. Do not break any.

### Git Intelligence — Recent Commits

Last relevant commits:
- `e01a588` — implement story 1.3 — welcome modal & display name
- `58dabca` — implement story 1.2 — login, auth, session, validators, DB schema
- `e6b86e7` — add db with docker compose
- `57c16ea` — create reset-welcome / seed-admin scripts

Current test baseline: 93 tests. **Do NOT break:**
- `src/lib/auth.test.ts`
- `src/lib/validators.test.ts`
- `tests/integration/auth.test.ts`
- `tests/integration/scaffold.test.ts`
- `tests/integration/welcome-modal.test.ts`
- `pnpm typecheck`, `pnpm lint`, `pnpm build`

### Project Structure After Story 1.4

```
src/
├── components/
│   ├── ui/                    ← unchanged
│   └── welcome-modal.tsx      ← unchanged
├── db/
│   ├── schema.ts              ← unchanged (players table already has all needed columns)
│   ├── index.ts               ← unchanged
│   ├── queries.ts             ← MODIFIED: add checkUsernameExists(), createPlayer()
│   └── seed-admin.ts          ← unchanged
├── lib/
│   ├── auth.ts                ← unchanged
│   ├── auth.test.ts           ← MODIFIED: add adminMiddleware export check
│   ├── middleware.ts          ← MODIFIED: add adminMiddleware
│   ├── types.ts               ← unchanged (ServerResult<T> already defined)
│   ├── validators.ts          ← MODIFIED: add createPlayerSchema + CreatePlayerInput
│   └── validators.test.ts     ← MODIFIED: add createPlayerSchema tests
└── routes/
    ├── __root.tsx             ← unchanged
    ├── index.tsx              ← MODIFIED: add admin link if isAdmin
    ├── login.tsx              ← unchanged
    └── admin/
        └── index.tsx          ← NEW: admin page with create-player form + createPlayerFn
tests/
└── integration/
    └── admin.test.ts          ← NEW: integration tests for admin feature
```

### References

- FR4 (admin create player account): [Source: prd.md#Functional Requirements]
- `players` table schema (id, username, passwordHash, displayName, isAdmin, hasSeenWelcome): [Source: src/db/schema.ts]
- Auth middleware pattern (import-protection): [Source: architecture/implementation-patterns-consistency-rules.md#Process Patterns]
- ServerResult<T> type: [Source: src/lib/types.ts + architecture/implementation-patterns-consistency-rules.md#Format Patterns]
- Admin authorization (`isAdmin` boolean): [Source: architecture/core-architectural-decisions.md#Authentication & Security]
- DB queries pattern (named functions in queries.ts): [Source: architecture/implementation-patterns-consistency-rules.md#Process Patterns]
- bcryptjs 12 rounds: [Source: src/db/seed-admin.ts + architecture/core-architectural-decisions.md#Authentication & Security]
- Navigation: admin NOT in TabBar (3 fixed tabs only): [Source: MEMORY.md#Navigation — Architecture finale]
- Design tokens (palette, fonts): [Source: src/styles/globals.css + MEMORY.md#Palette]
- TanStack Form + Zod v4 (no adapter): [Source: MEMORY.md#TanStack CLI — Commande create et add-ons]
- createServerFn API verification: [Source: Story 1.2/1.3 Dev Notes — always search-docs before implementing]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
