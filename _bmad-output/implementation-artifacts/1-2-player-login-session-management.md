# Story 1.2: Player Login & Session Management

Status: ready-for-dev

## Story

As a player,
I want to log in with my username and password,
so that I can securely access the campaign app.

## Acceptance Criteria

**AC1 — Redirect unauthenticated users:**
Given I am not authenticated,
When I navigate to any protected route,
Then I am redirected to the /login page.

**AC2 — Successful login:**
Given I am on the /login page,
When I enter a valid username and password and submit,
Then an HTTP-only session cookie is created, the `sessions` table is updated, and I am redirected to the Campaign view (/).

**AC3 — Failed login:**
Given I am on the /login page,
When I enter an invalid username or incorrect password,
Then an error message is displayed ("Identifiant ou mot de passe incorrect") and no session cookie is created.

**AC4 — Server-side session verification:**
Given I am authenticated,
When any protected server function is called,
Then my session is verified server-side via `src/lib/auth.ts` before the action is executed.

**AC5 — Army ownership enforcement:**
Given I am authenticated and own army A,
When a request attempts to mutate army B's data,
Then `armyOwnerMiddleware` rejects the request server-side and returns a FORBIDDEN error.

*Note: AC5 is scaffolded in this story but will be fully testable in Epic 2 when the `armies` table exists.*

*Tables created by this story: `players` (id, username, passwordHash, displayName, isAdmin, hasSeenWelcome), `sessions` (id, playerId, expiresAt, createdAt)*

## Tasks / Subtasks

- [ ] Task 1 — Install new dependencies (AC2, AC4)
  - [ ] `pnpm add bcryptjs` and `pnpm add -D @types/bcryptjs`
  - [ ] Verify `bcryptjs` works with the current Node.js 20 runtime (no native deps — should be fine)
  - [ ] Do NOT install `bcrypt` (native deps, compile issues on Railway) — use `bcryptjs` only

- [ ] Task 2 — Define DB schema: `players` and `sessions` tables (AC2, AC4)
  - [ ] Open `src/db/schema.ts` and replace the placeholder `export {}` with the full schema (see Dev Notes)
  - [ ] Run `pnpm drizzle-kit push` to apply schema to the dev DB
  - [ ] Verify tables exist in the DB (use `pnpm drizzle-kit studio` or a psql client)

- [ ] Task 3 — Create `src/lib/auth.ts` (AC1, AC2, AC4, AC5)
  - [ ] Implement `getSession(event?)`: reads session cookie, looks up `sessions` table, returns `{ playerId, isAdmin, displayName }` or null
  - [ ] Implement `createSession(playerId)`: inserts into `sessions`, sets HTTP-only session cookie
  - [ ] Implement `deleteSession(sessionId)`: deletes from `sessions`, clears cookie
  - [ ] Implement `authMiddleware` using `createMiddleware()`: calls `getSession()`, throws UNAUTHORIZED if null, injects `session` into context
  - [ ] Implement `armyOwnerMiddleware` using `createMiddleware()`: checks `army.playerId === context.session.playerId` (or `isAdmin`), throws FORBIDDEN
  - [ ] Search TanStack Start docs for current cookie API BEFORE implementing: `npx @tanstack/cli search-docs "cookies" --library start --framework react`
  - [ ] Search for middleware API: `npx @tanstack/cli search-docs "createMiddleware" --library start --framework react`

- [ ] Task 4 — Create `src/lib/validators.ts` (AC2, AC3)
  - [ ] Export `loginSchema`: Zod schema with `username` (string, min 1) and `password` (string, min 1)
  - [ ] Use `createInsertSchema` from `drizzle-zod` to derive base schemas from `players` table
  - [ ] Export `insertPlayerSchema` (for story 1.4 — player creation by admin)

- [ ] Task 5 — Create `src/routes/login.tsx` (AC2, AC3)
  - [ ] Create login page component with username + password form using TanStack Form + `loginSchema`
  - [ ] Use shadcn `Input`, `Button`, `Label` primitives (NOT shadcn Form component)
  - [ ] Create `loginFn` server function: validate input, lookup player by username, bcrypt compare, create session, redirect to `/`
  - [ ] Create `logoutFn` server function: delete session, redirect to `/login`
  - [ ] Show error message on failed login (AC3) — use React state, not toast (login errors are inline)
  - [ ] Apply Campaign TOW visual style: `--color-bg` background, `--font-display` for title, `--color-brand` for submit button
  - [ ] Route must be accessible WITHOUT authentication (no `authMiddleware`)

- [ ] Task 6 — Seed admin account (AC2)
  - [ ] Create `src/db/seed-admin.ts`: idempotent script that upserts the admin player using `ADMIN_USERNAME` (env, default: "admin") and `ADMIN_PASSWORD_HASH` (env, required)
  - [ ] Run script: `pnpm tsx src/db/seed-admin.ts`
  - [ ] Add `seed:admin` script to `package.json`: `"seed:admin": "tsx src/db/seed-admin.ts"`
  - [ ] Document in `.env.example`: add `ADMIN_USERNAME=admin` with comment

- [ ] Task 7 — Protect routes: update `src/routes/__root.tsx` (AC1)
  - [ ] Add session loader to `__root.tsx` that calls `getSession()` on every render
  - [ ] If no session AND route is not `/login`, redirect to `/login`
  - [ ] Use TanStack Router's `beforeLoad` or `loader` for the redirect — search docs first: `npx @tanstack/cli search-docs "redirect beforeLoad" --library router --framework react`
  - [ ] Session data available in root context for child routes (username, isAdmin)

- [ ] Task 8 — Write tests (AC1–AC4)
  - [ ] `src/lib/auth.test.ts`: unit test session helper logic (pure parts only — crypto ops, not cookie I/O)
  - [ ] `src/lib/validators.test.ts`: test loginSchema validation (valid/invalid inputs)
  - [ ] Integration test for `loginFn` server function (mocked DB or test DB): valid creds → session created; invalid creds → error returned
  - [ ] `pnpm test` must pass after all changes

- [ ] Task 9 — Verify typecheck + lint (all ACs)
  - [ ] `pnpm typecheck` — zero errors
  - [ ] `pnpm lint` — zero errors (bcryptjs types must be present)
  - [ ] `pnpm build` — succeeds

## Dev Notes

### New Dependencies

```bash
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
```

**Why `bcryptjs` (not `bcrypt`):** `bcrypt` requires native Node.js addons that need compilation. This causes issues on Railway with nixpacks. `bcryptjs` is a pure-JS implementation with no native deps — simpler, more portable, works identically.

### DB Schema — `src/db/schema.ts`

Replace the placeholder `export {}` with:

```typescript
import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core'

export const players = pgTable('players', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  isAdmin: boolean('is_admin').notNull().default(false),
  hasSeenWelcome: boolean('has_seen_welcome').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: text('player_id')
    .notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

**Key decisions:**
- `crypto.randomUUID()` — Node 19+ built-in, no extra dependency
- `password_hash` column (snake_case DB, camelCase code) — naming convention
- `sessions.playerId` cascades on player delete — clean orphan handling
- Session expiry: 30 days by default (see auth.ts below)
- No `updatedAt` for MVP — add later if needed

### Auth Module — `src/lib/auth.ts`

**CRITICAL:** Before implementing, search for the current TanStack Start v1 cookie API:
```bash
npx @tanstack/cli search-docs "cookies getCookie setCookie" --library start --framework react
npx @tanstack/cli search-docs "createMiddleware server context" --library start --framework react
npx @tanstack/cli doc start framework/react/guide/middleware
```

Expected pattern for cookies in TanStack Start RC (verify before using):
```typescript
import { getCookie, setCookie, deleteCookie } from 'vinxi/http'
// OR
import { useAppSession } from '@tanstack/react-start/server'
```

**Skeleton for `src/lib/auth.ts`:**

```typescript
import { createMiddleware } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '../db/index'
import { sessions, players } from '../db/schema'
// Cookie import: verify current API with search-docs before finalizing
// import { getCookie, setCookie, deleteCookie } from 'vinxi/http'

const SESSION_COOKIE = 'session_id'
const SESSION_DURATION_DAYS = 30

export type SessionData = {
  playerId: string
  isAdmin: boolean
  displayName: string
}

export async function getSession(): Promise<SessionData | null> {
  // 1. Read SESSION_COOKIE from request cookies (use verified API from docs)
  // 2. If no cookie → return null
  // 3. Lookup sessions table by id
  // 4. If not found or expired → return null
  // 5. Join with players to get isAdmin, displayName
  // 6. Return SessionData
}

export async function createSession(playerId: string): Promise<void> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)

  const [session] = await db
    .insert(sessions)
    .values({ playerId, expiresAt })
    .returning({ id: sessions.id })

  // Set HTTP-only session cookie:
  // setCookie(SESSION_COOKIE, session.id, {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === 'production',
  //   sameSite: 'lax',
  //   expires: expiresAt,
  //   path: '/',
  // })
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId))
  // deleteCookie(SESSION_COOKIE)
}

// Middleware: inject session into server function context
export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const session = await getSession()
  if (!session) throw new Error('UNAUTHORIZED')
  return next({ context: { session } })
})

// Middleware: verify army ownership (used in Epic 2+)
// armyId must be in the server function input data
export const armyOwnerMiddleware = createMiddleware()
  .middleware([authMiddleware])
  .server(async ({ next, context, data }) => {
    // Will be fully implemented in Epic 2 when armies table exists
    // Pattern:
    // const army = await db.query.armies.findFirst({ where: eq(armies.id, data.armyId) })
    // if (!army) throw new Error('NOT_FOUND')
    // if (army.playerId !== context.session.playerId && !context.session.isAdmin)
    //   throw new Error('FORBIDDEN')
    // return next({ context: { ...context, army } })
    return next({ context })
  })
```

**IMPORTANT:** `armyOwnerMiddleware` is scaffolded as a pass-through in story 1.2. It will be completed in story 2.1 when the `armies` table exists. Do NOT leave a broken import — keep the scaffold working.

### Login Server Function — Pattern

```typescript
// src/routes/login.tsx — loginFn pattern
import { createServerFn } from '@tanstack/react-start'
import { compare } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../db/index'
import { players } from '../db/schema'
import { createSession } from '../lib/auth'
import { loginSchema } from '../lib/validators'

type ServerResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }

export const loginFn = createServerFn({ method: 'POST' })
  .validator(loginSchema)
  .handler(async ({ data }): Promise<ServerResult<{ redirect: string }>> => {
    const player = await db.query.players.findFirst({
      where: eq(players.username, data.username),
    })

    if (!player) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Identifiant ou mot de passe incorrect' } }
    }

    const passwordValid = await compare(data.password, player.passwordHash)
    if (!passwordValid) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Identifiant ou mot de passe incorrect' } }
    }

    await createSession(player.id)
    return { success: true, data: { redirect: '/' } }
  })
```

**Security note:** Return the same error message for "user not found" and "wrong password" — prevents username enumeration.

### TanStack Form + Zod v4 — No Adapter

The `@tanstack/zod-form-adapter` package is NOT compatible with zod v4 (only `^3.x`). TanStack Form supports Zod v4 natively via Standard Schema. Pass the schema directly:

```typescript
import { useForm } from '@tanstack/react-form'
import { loginSchema } from '../lib/validators'

const form = useForm({
  defaultValues: { username: '', password: '' },
  validators: { onSubmit: loginSchema },
  // No adapter import needed
})
```

This is confirmed working with zod v4 per TanStack/form issue #1529 (closed as resolved in TanStack Form v0.42+).

### Admin Account Seed — `src/db/seed-admin.ts`

```typescript
import { hash } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from './index'
import { players } from './schema'

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin'
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH

if (!ADMIN_PASSWORD_HASH) {
  throw new Error('[seed-admin] ADMIN_PASSWORD_HASH environment variable is required')
}

async function seedAdmin() {
  const existing = await db.query.players.findFirst({
    where: eq(players.username, ADMIN_USERNAME),
  })

  if (existing) {
    console.log(`[seed-admin] Admin account "${ADMIN_USERNAME}" already exists — skipping`)
    process.exit(0)
  }

  await db.insert(players).values({
    username: ADMIN_USERNAME,
    passwordHash: ADMIN_PASSWORD_HASH!,
    displayName: ADMIN_USERNAME,
    isAdmin: true,
    hasSeenWelcome: false,
  })

  console.log(`[seed-admin] Admin account "${ADMIN_USERNAME}" created successfully`)
  process.exit(0)
}

seedAdmin().catch((err) => {
  console.error('[seed-admin] Failed:', err)
  process.exit(1)
})
```

**Required in `.env.example`** (add these lines):
```
ADMIN_USERNAME=admin
# ADMIN_PASSWORD_HASH is already in .env.example from story 1.1
```

### Protected Routes — `__root.tsx` Pattern

Search for the current TanStack Start session/redirect API:
```bash
npx @tanstack/cli search-docs "redirect beforeLoad loader" --library router --framework react
```

Expected pattern:
```typescript
// In __root.tsx Route definition, add a beforeLoad or loader:
export const Route = createRootRouteWithContext<MyRouterContext>()({
  // ...existing head()...
  beforeLoad: async ({ location }) => {
    if (location.pathname === '/login') return // allow login page
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { session }
  },
  shellComponent: RootDocument,
})
```

**CRITICAL:** Verify `getSession()` can be called in `beforeLoad` (requires server context). If not available in `beforeLoad`, use the `loader` function instead. Check docs first.

### Validators — `src/lib/validators.ts`

```typescript
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'
import { players } from '../db/schema'

// Login form schema
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginInput = z.infer<typeof loginSchema>

// Player creation schema (for story 1.4 — admin creates accounts)
export const insertPlayerSchema = createInsertSchema(players, {
  username: z.string().min(2, 'Username must be at least 2 characters').max(50),
  displayName: z.string().min(1, 'Display name is required').max(100),
}).pick({ username: true, displayName: true, isAdmin: true })
```

### Project Structure After Story 1.2

```
src/
├── db/
│   ├── schema.ts              ← MODIFIED: players + sessions tables defined
│   ├── index.ts               ← unchanged (pool + health check)
│   └── seed-admin.ts          ← NEW: idempotent admin account creation
├── lib/
│   ├── auth.ts                ← NEW: getSession, createSession, deleteSession, authMiddleware, armyOwnerMiddleware
│   ├── auth.test.ts           ← NEW: unit tests for pure auth logic
│   ├── validators.ts          ← NEW: loginSchema, insertPlayerSchema
│   ├── validators.test.ts     ← NEW: Zod schema validation tests
│   ├── placeholder.test.ts    ← unchanged
│   └── utils.ts               ← unchanged (shadcn cn utility)
└── routes/
    ├── __root.tsx             ← MODIFIED: session check + redirect to /login
    ├── login.tsx              ← NEW: login page + loginFn + logoutFn
    └── index.tsx              ← unchanged (placeholder — session now required to view)
```

### Naming & Conventions (Mandatory)

| Scope | Convention |
|---|---|
| DB tables | snake_case plural: `players`, `sessions` |
| DB columns | snake_case: `player_id`, `password_hash`, `is_admin`, `has_seen_welcome`, `expires_at` |
| TS variables/functions | camelCase: `getSession`, `createSession`, `loginFn` |
| React components | PascalCase: `LoginPage` |
| Files | kebab-case: `auth.ts`, `seed-admin.ts` |

### Architecture Boundaries (NEVER Violate)

- `src/lib/auth.ts` is the ONLY module that reads/writes sessions and cookies
- `src/db/` is the ONLY directory that imports from `drizzle-orm`
- Domain logic in `src/lib/` never imports `db` directly (EXCEPTION: `auth.ts` needs DB access for session lookup — this is acceptable as auth is infrastructure, not domain logic)
- Server functions MUST use `createMiddleware()` for auth — NEVER inline session checks in route files
- Login route (`/login`) must NOT use `authMiddleware` — it's the unauthenticated entry point

### Error Handling Pattern

```typescript
// Mutations return ServerResult<T> — applied to loginFn and logoutFn
type ServerResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string } }

type ErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR'
```

- Login form errors: inline in the form (not toast) — use React `useState`
- Session expiry: redirect to `/login` (caught by `beforeLoad` in `__root.tsx`)
- Server errors in protected functions: throw → caught by React error boundary

### Login UI — Design System

Apply the Campaign TOW palette on the `/login` page:
- Page background: `var(--color-bg)` (#f1eade)
- Card/form surface: `var(--color-surface)` (#fffbf5) with `border: 1px solid var(--color-border)`
- Title "Campaign TOW": `font-family: var(--font-display)` (Cinzel), navy color `var(--color-brand)` (#334155)
- Submit button: navy `var(--color-brand)` background, white text
- Error message: `var(--color-malus)` (#b82c2c) background `var(--color-malus-bg)` (#fdf0f0)
- Mobile-first: centered card, max-width ~380px, padding 24px, rounded corners

### Security Checklist

- [ ] Session cookie: `httpOnly: true`, `secure: true` in production, `sameSite: 'lax'`
- [ ] Password comparison: always use `bcryptjs.compare()` — never string equality
- [ ] Same error message for "user not found" vs "wrong password" — no username enumeration
- [ ] SESSION_SECRET present check at startup (if used for cookie signing — verify docs)
- [ ] Session expiry enforced in DB lookup (compare `expiresAt` with current date)
- [ ] `armyOwnerMiddleware` checks both player ownership AND admin bypass

### Key TanStack CLI Commands for Implementation

```bash
# Session/cookie API (MANDATORY before implementing auth.ts)
npx @tanstack/cli search-docs "cookies session" --library start --framework react
npx @tanstack/cli search-docs "setCookie getCookie" --library start --framework react

# Middleware API
npx @tanstack/cli search-docs "createMiddleware" --library start --framework react
npx @tanstack/cli doc start framework/react/guide/middleware

# Redirect / route protection
npx @tanstack/cli search-docs "redirect beforeLoad" --library router --framework react
npx @tanstack/cli doc router framework/react/guide/authenticated-routes

# Server functions + validators
npx @tanstack/cli search-docs "createServerFn validator" --library start --framework react
```

### Previous Story Learnings (from Story 1.1)

- **CLI generates `vite.config.ts`** — not `app.config.ts`. Both may coexist depending on add-on version. Verify which is present.
- **Zod v4 is installed** (`"zod": "^4.3.6"`) — use Standard Schema approach with TanStack Form, NO `@tanstack/zod-form-adapter`
- **`drizzle-zod` 0.8.3** is installed and zod v4 compatible — `createInsertSchema` works as expected
- **bcryptjs** was referenced in story 1.1 (ADMIN_PASSWORD_HASH generation) but the package itself was NOT installed — install it in this story
- **Environment guard pattern** (already established):
  ```typescript
  if (!process.env.REQUIRED_VAR) {
    throw new Error('[module] REQUIRED_VAR environment variable is required')
  }
  ```
  Apply this in `seed-admin.ts` for `ADMIN_PASSWORD_HASH`.
- **`src/db/index.ts`** already throws if `DATABASE_URL` is missing (story 1.1 guard) — consistent pattern
- **ESLint config** already has `src/components/ui/**` override for `import/consistent-type-specifier-style`
- **`pnpm` only** — never `npm` or `yarn` in scripts or documentation

### Git Intelligence — Recent Work (from Story 1.1 completion)

Last commits establish:
- Scaffold cleanup: demo routes removed, `__root.tsx` rebranded (`lang="fr"`, title="Campaign TOW")
- `src/styles.css` imports `./styles/globals.css` (CSS token chain is intact)
- `drizzle-kit` moved to devDependencies
- CI pipeline uses `pnpm 10` (pinned version)
- 33 tests passing: 32 ATDD scaffold tests + 1 placeholder

**Do not break:** `pnpm typecheck`, `pnpm lint`, `pnpm test` (33 tests). Add new tests for auth/validators — do not remove existing ones.

### References

- Auth architecture decision: [Source: architecture/core-architectural-decisions.md#Authentication & Security]
- Middleware pattern: [Source: architecture/implementation-patterns-consistency-rules.md#Process Patterns]
- Project structure (auth.ts, login.tsx, validators.ts locations): [Source: architecture/project-structure-boundaries.md#Complete Project Directory Structure]
- Architectural boundaries (auth.ts is sole session module): [Source: architecture/project-structure-boundaries.md#Architectural Boundaries]
- FR1 (login), FR6 (army ownership), FR2 (display name — story 1.3): [Source: prd.md#Functional Requirements]
- Session cookie + bcrypt: [Source: architecture/core-architectural-decisions.md#Authentication & Security]
- ServerResult pattern: [Source: architecture/implementation-patterns-consistency-rules.md#Format Patterns]
- Login UI design tokens: [Source: _bmad-output/planning-artifacts/ux-mockup.html v4.0]
- Naming conventions: [Source: architecture/implementation-patterns-consistency-rules.md#Naming Patterns]
- TanStack Form + Zod v4 Standard Schema (no adapter): [Source: TanStack/form issue #1529, verified story 1.1]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
