# Story 1.3: First-Login Welcome Modal & Display Name

Status: done

## Story

As a player logging in for the first time,
I want to see a welcome message and be able to set my display name,
so that I understand how the app works and can identify myself correctly in the campaign.

## Acceptance Criteria

**AC1 — Welcome modal appears on first login:**
Given this is my first login (`hasSeenWelcome = false`),
When the Campaign view loads after authentication,
Then the WelcomeModal appears explaining the app, inviting me to update my display name, and showing the admin contact info.

**AC2 — Dismissing the modal marks it as seen:**
Given the WelcomeModal is open,
When I dismiss it (click outside, press Escape, or click the dismiss button),
Then `hasSeenWelcome` is set to `true` in the `players` table and the modal does not appear on subsequent logins.

**AC3 — Display name update succeeds:**
Given I am logged in,
When I submit a new display name via the form in the WelcomeModal (or any profile form),
Then my `displayName` is updated in the `players` table and reflected throughout the app after the next session refresh.

**AC4 — Validation rejects empty/whitespace display names:**
Given I am logged in,
When I submit an empty string or a whitespace-only display name,
Then a validation error is shown ("Display name is required") and no update is made.

**AC5 — Modal does not appear on subsequent logins:**
Given `hasSeenWelcome = true` for my account,
When the Campaign view loads,
Then the WelcomeModal is not shown.

## Tasks / Subtasks

- [x] Task 1 — Extend `SessionData` in `src/lib/auth.ts` (AC1, AC5)
  - [x] Add `hasSeenWelcome: boolean` to `SessionData` type
  - [x] Update `getSession()` to select `hasSeenWelcome` from the players join
  - [x] Update `auth.test.ts` to cover the new field (mock DB must return hasSeenWelcome)

- [x] Task 2 — Add `updateDisplayNameSchema` to `src/lib/validators.ts` (AC3, AC4)
  - [x] Export `updateDisplayNameSchema`: `z.object({ displayName: z.string().trim().min(1, 'Display name is required').max(100) })`
  - [x] Export `UpdateDisplayNameInput` type
  - [x] Update `src/lib/validators.test.ts`: add tests for valid input, empty string, whitespace-only string

- [x] Task 3 — Create `src/components/welcome-modal.tsx` (AC1, AC2, AC3, AC4)
  - [x] Use shadcn `Dialog` (installed via `pnpm dlx shadcn@latest add dialog`) — `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`
  - [x] Props: `open: boolean`, `displayName: string`, `onDismiss: () => void`, `onUpdateDisplayName: (name: string) => Promise<void>`
  - [x] Content:
    - Title: "Bienvenue dans Campaign TOW" (Cinzel, navy)
    - Description: short explanation of the app (tracking XP, upgrades, campaign history)
    - Contact admin: "Pour toute question, contactez Ben (admin)"
    - Inline TanStack Form with a single `displayName` field + submit button
    - Dismiss button (secondary): "Continuer sans modifier"
  - [x] Dismiss action: calls `onDismiss()` (which marks welcome seen)
  - [x] Display name submit: calls `onUpdateDisplayName(name)`, then calls `onDismiss()`
  - [x] Display name form uses `updateDisplayNameSchema` for validation (TanStack Form + Zod, no adapter)
  - [x] Show validation errors inline (not toast)
  - [x] Apply Campaign TOW design tokens (see Dev Notes — UX section)
  - [x] `Dialog` `onOpenChange` must call `onDismiss()` to handle click-outside and Escape key (AC2)

- [x] Task 4 — Create server functions in `src/routes/index.tsx` (AC2, AC3, AC4)
  - [x] `markWelcomeSeenFn`: `createServerFn({ method: 'POST' }).middleware([authMiddleware]).handler(...)` — updates `players.hasSeenWelcome = true` where `id = context.session.playerId`
  - [x] `updateDisplayNameFn`: `createServerFn({ method: 'POST' }).middleware([authMiddleware]).inputValidator(updateDisplayNameSchema).handler(...)` — updates `players.displayName` where `id = context.session.playerId`, returns `ServerResult<{ displayName: string }>`
  - [x] Both functions require `authMiddleware` — no inline session check
  - [x] Note: `authMiddleware` defined locally in `index.tsx` using `createMiddleware` + dynamic import of `getSession` — avoids static `auth.ts` import leaking into client bundle (import-protection pattern)

- [x] Task 5 — Integrate WelcomeModal into `src/routes/index.tsx` (AC1, AC2, AC3, AC5)
  - [x] Get session context via `useRouteContext({ from: '__root__' })` with union type narrowing
  - [x] Use React `useState` for `modalOpen`: initialized to `session?.hasSeenWelcome === false`
  - [x] Handler `handleDismiss`: calls `markWelcomeSeenFn()`, sets `modalOpen = false`, calls `router.invalidate()` to refresh session context
  - [x] Handler `handleUpdateDisplayName`: calls `updateDisplayNameFn({ data: { displayName } })`
  - [x] Render `<WelcomeModal open={modalOpen} displayName={session?.displayName ?? ''} onDismiss={handleDismiss} onUpdateDisplayName={handleUpdateDisplayName} />`
  - [x] `router.invalidate()` forces re-run of `beforeLoad` in `__root.tsx` → `getSessionFn()` → updated `displayName` reflected in session context

- [x] Task 6 — Write tests (AC1–AC5)
  - [x] `src/lib/validators.test.ts`: tests for `updateDisplayNameSchema` (valid, empty, whitespace-only, max length) — 6 new tests
  - [x] `src/lib/auth.test.ts`: added test 1.3-UNIT-007 covering hasSeenWelcome field
  - [x] `tests/integration/welcome-modal.test.ts`: 18 integration tests covering all ACs — all GREEN
  - [x] `pnpm test` passes: 92 tests (67 baseline + 25 new)

- [x] Task 7 — Verify quality gates
  - [x] `pnpm typecheck` — zero errors
  - [x] `pnpm lint` — zero errors
  - [x] `pnpm build` — succeeds

## Dev Notes

### DB Schema — No Changes Required

The `players` table already has both required columns (created in story 1.2):

```typescript
// src/db/schema.ts — already exists, DO NOT modify
hasSeenWelcome: boolean('has_seen_welcome').notNull().default(false),
displayName: text('display_name').notNull(),
```

No `drizzle-kit push` needed. No migration needed.

### Task 1 — Extending `SessionData` and `getSession()`

Current `SessionData` (auth.ts line 15-19):
```typescript
export type SessionData = {
  playerId: string
  isAdmin: boolean
  displayName: string
  // hasSeenWelcome is MISSING — add it
}
```

After change:
```typescript
export type SessionData = {
  playerId: string
  isAdmin: boolean
  displayName: string
  hasSeenWelcome: boolean  // ADD THIS
}
```

Current `getSession()` select (auth.ts line 28-35):
```typescript
.select({
  playerId: sessions.playerId,
  expiresAt: sessions.expiresAt,
  isAdmin: players.isAdmin,
  displayName: players.displayName,
  // ADD: hasSeenWelcome: players.hasSeenWelcome,
})
```

Return statement update:
```typescript
return {
  playerId: row.playerId,
  isAdmin: row.isAdmin,
  displayName: row.displayName,
  hasSeenWelcome: row.hasSeenWelcome,  // ADD THIS
}
```

**Impact:** TypeScript will flag any callsite that doesn't handle `hasSeenWelcome`. `__root.tsx` returns `{ session }` from `beforeLoad` — no change needed there. The `getSessionFn` server function return type will automatically include `hasSeenWelcome`.

### Task 2 — Validator for Display Name Update

Add to `src/lib/validators.ts`:
```typescript
// Display name update schema — for WelcomeModal and profile settings (story 1.3)
export const updateDisplayNameSchema = z.object({
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be 100 characters or less')
    .trim(),
})
export type UpdateDisplayNameInput = z.infer<typeof updateDisplayNameSchema>
```

**Critical:** `.trim()` is placed BEFORE `.min(1)` in the chain order — actually in Zod v4, `.trim()` is a transform, applied after parsing. A whitespace-only string like `"   "` WILL pass `.min(1)` but after `.trim()` becomes `""`. To properly reject whitespace-only, use:
```typescript
displayName: z.string().trim().min(1, 'Display name is required').max(100),
```
Zod v4 applies transforms during parsing, so `.trim()` runs first when chained this way.

**Test cases required:**
```typescript
// Valid
updateDisplayNameSchema.parse({ displayName: 'Thomas' }) // → { displayName: 'Thomas' }
updateDisplayNameSchema.parse({ displayName: '  Thomas  ' }) // → { displayName: 'Thomas' } (trimmed)

// Invalid
updateDisplayNameSchema.safeParse({ displayName: '' }).success // → false
updateDisplayNameSchema.safeParse({ displayName: '   ' }).success // → false (whitespace-only)
updateDisplayNameSchema.safeParse({ displayName: 'a'.repeat(101) }).success // → false
```

### Task 3 — WelcomeModal Component

**File:** `src/components/welcome-modal.tsx`

**shadcn Dialog** — already installed in story 1.1. Import from `./ui/dialog`.

Check that these are available:
```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
```

**Component structure:**
```typescript
import { useForm } from '@tanstack/react-form'
import { updateDisplayNameSchema } from '../lib/validators'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'

interface WelcomeModalProps {
  open: boolean
  displayName: string
  onDismiss: () => void
  onUpdateDisplayName: (name: string) => Promise<void>
}

export function WelcomeModal({ open, displayName, onDismiss, onUpdateDisplayName }: WelcomeModalProps) {
  const form = useForm({
    defaultValues: { displayName },
    validators: { onSubmit: updateDisplayNameSchema },
    onSubmit: async ({ value }) => {
      await onUpdateDisplayName(value.displayName)
    },
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onDismiss() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand)' }}>
            Bienvenue dans Campaign TOW
          </DialogTitle>
          <DialogDescription>
            Cette application vous permet de suivre l'évolution de votre armée au fil de la campagne :
            XP gagné, améliorations débloquées, blessures permanentes, et historique de vos parties.
            Pour toute question ou problème de compte, contactez Ben (admin).
          </DialogDescription>
        </DialogHeader>
        {/* Display name form */}
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
          <form.Field name="displayName">
            {(field) => (
              <div>
                <Label htmlFor="displayName">Nom d'affichage</Label>
                <Input
                  id="displayName"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Votre nom dans la campagne"
                />
                {field.state.meta.errors.length > 0 && (
                  <p style={{ color: 'var(--color-malus)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {field.state.meta.errors[0]?.message}
                  </p>
                )}
              </div>
            )}
          </form.Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onDismiss}>
              Continuer sans modifier
            </Button>
            <Button type="submit" style={{ background: 'var(--color-brand)', color: 'white' }}>
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**UX Design Tokens (apply throughout):**
- Background: `var(--color-bg)` (#f1eade)
- Surface: `var(--color-surface)` (#fffbf5)
- Title font: `var(--font-display)` (Cinzel)
- Brand color: `var(--color-brand)` (#334155)
- Error: `var(--color-malus)` (#b82c2c) / bg `var(--color-malus-bg)` (#fdf0f0)
- Dialog content background: `var(--color-surface)` with `border: 1px solid var(--color-border)`

**Important:** The `Dialog` `onOpenChange` prop receives `false` when the user closes the dialog (click outside, Escape). We call `onDismiss()` to mark welcome as seen and update DB. This ensures AC2 is met regardless of how the dialog is closed.

### Task 4 — Server Functions in `src/routes/index.tsx`

**MANDATORY before implementing:** Check the current API for `createServerFn` with middleware:
```bash
npx @tanstack/cli search-docs "createServerFn middleware inputValidator" --library start --framework react
```

**Critical learning from story 1.2 debug log:** The method is `.inputValidator()` not `.validator()`. Always search docs before assuming.

**Pattern for `markWelcomeSeenFn`:**
```typescript
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '../db/index'
import { players } from '../db/schema'
import { authMiddleware } from '../lib/auth'

const markWelcomeSeenFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<void> => {
    await db
      .update(players)
      .set({ hasSeenWelcome: true })
      .where(eq(players.id, context.session.playerId))
  })
```

**Pattern for `updateDisplayNameFn`:**
```typescript
import { updateDisplayNameSchema } from '../lib/validators'

type ServerResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }

const updateDisplayNameFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(updateDisplayNameSchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ displayName: string }>> => {
    await db
      .update(players)
      .set({ displayName: data.displayName })
      .where(eq(players.id, context.session.playerId))
    return { success: true, data: { displayName: data.displayName } }
  })
```

**Note on `ServerResult`:** Defined in `implementation-patterns-consistency-rules.md`. Mutations return `ServerResult<T>`. This type should eventually be exported from a shared location (`src/lib/types.ts`) but for MVP, define inline per route or extract later.

### Task 5 — Integration in `src/routes/index.tsx`

```typescript
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useRouteContext } from '@tanstack/react-router'
import { useState } from 'react'
import { WelcomeModal } from '../components/welcome-modal'

export const Route = createFileRoute('/')({ component: CampaignView })

function CampaignView() {
  const router = useRouter()
  const { session } = useRouteContext({ from: '__root__' })
  const [modalOpen, setModalOpen] = useState(session?.hasSeenWelcome === false)

  const handleDismiss = async () => {
    await markWelcomeSeenFn()
    setModalOpen(false)
    // Invalidate router to refresh session context (displayName may have changed)
    await router.invalidate()
  }

  const handleUpdateDisplayName = async (name: string) => {
    const result = await updateDisplayNameFn({ data: { displayName: name } })
    if (result.success) {
      // Dismiss will be called by WelcomeModal after this callback — markWelcomeSeen included in handleDismiss
    }
  }

  return (
    <>
      <WelcomeModal
        open={modalOpen}
        displayName={session?.displayName ?? ''}
        onDismiss={handleDismiss}
        onUpdateDisplayName={handleUpdateDisplayName}
      />
      <main style={{ padding: '2rem' }}>
        <h1>Campaign TOW</h1>
        <p>Campaign view — story 1.3+</p>
      </main>
    </>
  )
}
```

**Key points:**
- `useRouteContext({ from: '__root__' })` — accesses the `{ session }` returned by `beforeLoad` in `__root.tsx`. After story 1.2, `beforeLoad` already returns `{ session }`. After Task 1, `session.hasSeenWelcome` will be available.
- `useState` init: `session?.hasSeenWelcome === false` — shows modal only when explicitly false, not when undefined
- `router.invalidate()` after dismiss/update forces re-run of `beforeLoad` → `getSessionFn()` → refreshed `displayName` in session context
- Calling both `updateDisplayNameFn` AND `markWelcomeSeenFn` on submit: the modal calls `onUpdateDisplayName` first, then calls `onDismiss` (which calls `markWelcomeSeenFn`). This sequence is correct — two separate DB updates is fine.

**Alternative if `useRouteContext` from `'__root__'` is not the right API:** check:
```bash
npx @tanstack/cli search-docs "useRouteContext parentRoute" --library router --framework react
```

### Data Access Pattern — Server Functions Importing DB

In TanStack Start, server functions in route files CAN and SHOULD import `db` from `src/db/index` and table schemas from `src/db/schema` for simple queries. This is the intended usage pattern.

```typescript
// This is ALLOWED in route server functions:
import { db } from '../db/index'
import { players } from '../db/schema'
import { eq } from 'drizzle-orm'
```

The architecture boundary rule "src/db/ is the ONLY directory that imports drizzle-orm" refers to table DEFINITIONS (`pgTable`, `text`, `boolean`...) which only live in `src/db/schema.ts`. Query operators (`eq`, `and`, `gt`) from `drizzle-orm` CAN be imported in any server function.

### Dialog Shadcn Installation Check

Verify shadcn Dialog was installed in story 1.1:
```bash
ls src/components/ui/dialog.tsx
```

If missing:
```bash
pnpm dlx shadcn@latest add dialog
```

### Naming & Conventions

| Scope | Convention | Example |
|---|---|---|
| Component file | kebab-case | `welcome-modal.tsx` |
| Component export | PascalCase | `WelcomeModal` |
| Server functions | camelCase | `markWelcomeSeenFn`, `updateDisplayNameFn` |
| Zod schemas | camelCase with Schema suffix | `updateDisplayNameSchema` |
| Type exports | PascalCase | `UpdateDisplayNameInput` |

### Architecture Boundaries — Compliance Checklist

- [ ] `auth.ts` is the ONLY module reading cookies / session rows → `markWelcomeSeenFn` must use `authMiddleware` for `context.session.playerId`, not read cookies directly
- [ ] `getSession()` is the ONLY place that builds `SessionData` → `hasSeenWelcome` added there, not in a separate DB call
- [ ] Server functions use `createMiddleware()` for auth — never inline `getCookie()` / `getSession()` in route handlers
- [ ] Display name update goes through `updateDisplayNameFn` — never mutated client-side only
- [ ] `WelcomeModal` is a pure UI component — it receives callbacks, makes no direct server calls itself
- [ ] Domain logic (none needed in this story) would live in `src/lib/` — N/A here

### Previous Story Learnings (from Story 1.2)

- **Cookie API:** `getCookie`, `setCookie`, `deleteCookie` from `@tanstack/react-start/server` — NOT from `vinxi/http`
- **createServerFn:** `.inputValidator()` not `.validator()` — always verify with `search-docs` before implementing
- **createMiddleware type:** `createMiddleware({ type: 'function' })` (story 1.2 used this in auth.ts)
- **Build protection:** `auth.ts` imports are server-only — do NOT import `auth.ts` at top-level in client components. In `__root.tsx`, a dynamic import wrapper (`createServerFn` with `import('../lib/auth')`) was used. For `index.tsx` server functions, they're already in a `createServerFn` context — direct import is fine.
- **TypeScript strict:** `pnpm typecheck` must pass. After adding `hasSeenWelcome` to `SessionData`, TS will flag any place that destructures the type — check all callsites.
- **Test baseline:** 67 tests passing post-story-1.2. Do not break any.
- **TanStack Form + Zod v4:** Native Standard Schema support — no `@tanstack/zod-form-adapter`. Pattern: `const form = useForm({ validators: { onSubmit: myZodSchema } })`
- **Error field access in TanStack Form:** `field.state.meta.errors[0]?.message` — verify this is the right path for Zod v4 errors (may be `field.state.meta.errors[0]` which is already a string or object; check TanStack Form docs)
- **Environment guard:** not needed in this story (no new env vars)

### Git Intelligence — Recent Commits

Last relevant commits:
- `e6b86e7` — add db with docker compose (dev convenience, no production impact)
- `58dabca` — implement story 1.2 — login, auth module, session, validators, DB schema
- `0ac09bd` — ATDD failing tests for 1.2

Current test baseline: 67 tests (auth.test.ts, validators.test.ts, placeholder.test.ts + ATDD tests).

**Do NOT break:**
- `src/lib/auth.test.ts` — update mocks to include `hasSeenWelcome` field
- `src/lib/validators.test.ts` — add tests, don't remove existing ones
- `pnpm typecheck`, `pnpm lint`, `pnpm build`

### Project Structure After Story 1.3

```
src/
├── components/
│   ├── ui/                    ← unchanged
│   └── welcome-modal.tsx      ← NEW: WelcomeModal (shadcn Dialog + TanStack Form)
├── db/
│   ├── schema.ts              ← unchanged (hasSeenWelcome already defined)
│   └── index.ts               ← unchanged
├── lib/
│   ├── auth.ts                ← MODIFIED: SessionData + getSession() include hasSeenWelcome
│   ├── auth.test.ts           ← MODIFIED: update mocks to include hasSeenWelcome
│   ├── validators.ts          ← MODIFIED: add updateDisplayNameSchema + type
│   └── validators.test.ts     ← MODIFIED: add updateDisplayNameSchema tests
└── routes/
    ├── __root.tsx             ← unchanged (session returned as-is, TypeScript will auto-update)
    └── index.tsx              ← MODIFIED: add server fns + WelcomeModal integration
```

### References

- FR2 (update display name), FR3 (welcome modal): [Source: prd.md#Functional Requirements]
- `players.hasSeenWelcome`, `players.displayName` columns: [Source: src/db/schema.ts (already implemented in story 1.2)]
- `getSession()` join pattern: [Source: src/lib/auth.ts lines 26-46]
- WelcomeModal in __root.tsx / index.tsx: [Source: architecture/project-structure-boundaries.md#Critical Integration Point — __root.tsx]
- Dialog component: [Source: _bmad-output/planning-artifacts/ux-design-specification/component-strategy.md#Design System Components]
- Design tokens (palette, fonts): [Source: _bmad-output/planning-artifacts/ux-design-specification/visual-design-foundation.md + globals.css]
- Server function patterns: [Source: architecture/implementation-patterns-consistency-rules.md#Process Patterns]
- ServerResult<T> type: [Source: architecture/implementation-patterns-consistency-rules.md#Format Patterns]
- TanStack Form + Zod v4 no adapter: [Source: Story 1.2 Dev Notes + TanStack/form issue #1529]
- Auth boundary (auth.ts sole session module): [Source: architecture/project-structure-boundaries.md#Architectural Boundaries]
- Cookie API: getCookie/setCookie from `@tanstack/react-start/server`: [Source: Story 1.2 Debug Log]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- ATDD phase: 17 integration tests (RED) + 7 E2E tests (test.skip) generated 2026-03-09
- Baseline: 67 tests passing, 17 new tests failing (red phase confirmed)
- Integration tests follow file-inspection pattern (Vitest, no server) — same as story 1.2
- E2E tests require auth fixtures + running server — to be enabled in green phase
- GREEN phase (2026-03-09): all 92 tests passing (67 baseline + 25 new). All quality gates pass.
- **Key learning — import-protection pattern:** `authMiddleware` cannot be statically imported in route files because `auth.ts` imports `@tanstack/react-start/server`. TanStack Start's bundler can only tree-shake `auth.ts` if all references to it are inside `.handler()` callbacks. Since `.middleware([authMiddleware])` is at module level, `authMiddleware` must be defined locally using `createMiddleware` + dynamic import of `getSession` inside `.server()`. This matches TanStack's recommended import-protection pattern. See: https://tanstack.com/start/latest/docs/framework/react/guide/import-protection
- shadcn Dialog was NOT pre-installed in story 1.1; installed via `pnpm dlx shadcn@latest add dialog` during story 1.3.
- Integration test 1.3-INT-015b added to document and enforce the import-protection pattern for future stories.
- Code review (2026-03-09): Fixed 5 issues — HIGH: onDismiss() missing after display name submit (modal stayed open); MEDIUM: ServerResult ignored in handleUpdateDisplayName (silent failures); MEDIUM: handleDismiss missing try/finally (modal could stay stuck on server error); MEDIUM: 1.3-UNIT-007 was a duplicate no-op test (replaced with structural type assertion); MEDIUM: sprint-status.yaml not in File List (added).
- Code review #2 (2026-03-09): Refactored H1+H2 — authMiddleware extracted to src/lib/middleware.ts (import-protected, scalable); DB operations extracted to src/db/queries.ts (markPlayerWelcomeSeen, updatePlayerDisplayName); index.tsx now imports both from these modules, removing local createMiddleware definition and direct drizzle-orm usage. Tests updated accordingly. 93/93 passing.
- Code review pass 2 (2026-03-09): Fixed HIGH-1 (authMiddleware duplication) — extracted import-protected authMiddleware to `src/lib/middleware.ts`; `index.tsx` now imports from there instead of redefining locally. Fixed pre-existing lint error in auth.test.ts (inline type import). Updated 1.3-INT-015b and added 1.3-INT-015c to enforce the centralized pattern.

### File List

- `src/lib/middleware.ts` — NEW: import-protected `authMiddleware` (central, reusable by all routes)
- `src/lib/types.ts` — NEW: shared `ServerResult<T>` type
- `src/lib/middleware.ts` — NEW: import-protected `authMiddleware` + `armyOwnerMiddleware` (moved from auth.ts, uses dynamic import pattern)
- `src/lib/validators.server.ts` — NEW: server-only schemas (drizzle-zod dependent, `insertPlayerSchema`)
- `src/lib/validators.ts` — MODIFIED: drizzle-zod deps removed (now pure Zod, client-safe)
- `src/lib/auth.ts` — MODIFIED: `SessionData` + `getSession()` include `hasSeenWelcome`; middlewares moved to middleware.ts
- `src/lib/auth.test.ts` — MODIFIED: added test 1.3-UNIT-007; imports authMiddleware/armyOwnerMiddleware from middleware.ts
- `src/lib/validators.ts` — MODIFIED: added `updateDisplayNameSchema` + `UpdateDisplayNameInput`
- `src/lib/validators.test.ts` — MODIFIED: added 6 tests for `updateDisplayNameSchema`
- `src/db/queries.ts` — NEW: named DB query functions (`markPlayerWelcomeSeen`, `updatePlayerDisplayName`)
- `src/components/ui/dialog.tsx` — NEW: shadcn Dialog component (installed via pnpm dlx shadcn)
- `src/components/welcome-modal.tsx` — NEW: WelcomeModal component (shadcn Dialog + TanStack Form)
- `src/routes/index.tsx` — MODIFIED: imports authMiddleware from middleware.ts + uses db/queries.ts
- `src/routes/login.tsx` — MODIFIED: ServerResult type moved to shared src/lib/types.ts
- `tests/integration/auth.test.ts` — MODIFIED: tests 1.2-INT-010/021/022 updated to check middleware.ts
- `tests/integration/welcome-modal.test.ts` — MODIFIED: 18 GREEN integration tests (was 17 RED); 1.3-INT-015b updated for centralized middleware pattern
- `e2e/welcome-modal.spec.ts` — unchanged (7 E2E tests still test.skip, pending server + auth fixtures)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED: story 1.3 status set to `review`
- `_bmad-output/test-artifacts/atdd-checklist-1-3.md` — reference (not modified in green phase)
