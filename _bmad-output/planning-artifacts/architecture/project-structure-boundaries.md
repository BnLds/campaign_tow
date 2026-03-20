# Project Structure & Boundaries

## Complete Project Directory Structure

```
campaign_tow/
├── README.md
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── app.config.ts                ← TanStack Start config
├── drizzle.config.ts            ← Drizzle Kit config
├── playwright.config.ts
├── vitest.config.ts
├── .env.example                 ← DATABASE_URL, SESSION_SECRET template
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml               ← lint → typecheck → vitest → playwright
├── public/
│   └── fonts/
│       ├── cinzel-*.woff2       ← Titres / noms d'unité
│       └── inter-*.woff2        ← Corps / stats / nav
├── e2e/
│   ├── login-and-browse.spec.ts
│   ├── post-match-flow.spec.ts
│   └── cross-army-view.spec.ts
├── drizzle/
│   └── migrations/              ← Generated SQL migrations for prod
└── src/
    ├── styles/
    │   └── globals.css           ← Tailwind directives + custom tokens (palette)
    ├── components/
    │   ├── ui/                   ← shadcn primitives (button, input, select, toast, etc.)
    │   ├── unit-card.tsx          ← UnitCard: stats bar, sub-profiles, deltas, XP tier frame
    │   ├── timeline-entry.tsx     ← TimelineEntry: completed match card
    │   ├── action-chip.tsx        ← ActionChip: pending invite / post-match item
    │   ├── army-list-item.tsx     ← ArmyListItem: player row, variant current (gold)
    │   ├── tab-bar.tsx            ← TabBar: 3 fixed tabs (Campagne/Armées/Références)
    │   ├── create-match-fab.tsx   ← CreateMatchFab: navy circular FAB
    │   ├── ref-table.tsx          ← RefTable: 2-column reference table (2D6 + result)
    │   ├── tier-up-screen.tsx     ← TierUpScreen: MVP sheet, V2 animated
    │   ├── welcome-modal.tsx      ← WelcomeModal: first-login dismissible overlay (FR3)
    │   └── post-match/
    │       ├── post-match-wizard.tsx  ← Flow orchestrator (step state, navigation)
    │       ├── step-unit-xp.tsx       ← XP entry per unit
    │       ├── step-tier-up.tsx       ← Improvement choice on tier-up
    │       └── step-character.tsx     ← Character injuries/bonuses
    ├── db/
    │   ├── schema.ts              ← All Drizzle tables (single file MVP)
    │   ├── index.ts               ← DB connection + drizzle client export
    │   ├── queries/               ← Named reusable queries (split by domain)
    │   │   ├── index.ts           ← Barrel re-export
    │   │   ├── players.ts         ← Player CRUD queries
    │   │   ├── armies.ts          ← Army CRUD + assignment queries
    │   │   ├── units.ts           ← Unit/sub-profile/stat modifier/gain queries
    │   │   ├── matches.ts         ← Timeline, match creation, results, pending matches
    │   │   └── evolutions.ts      ← Post-match XP, consequences, wizard completion
    │   └── seed.ts                ← Dev/E2E seed via real OWB parser
    ├── lib/
    │   ├── constants.ts           ← XP thresholds, 2D6 tables, improvements per tier, static campaign data
    │   ├── xp-calculator.ts       ← calculateTier(), getAvailableImprovements() — imports from constants.ts
    │   ├── xp-calculator.test.ts
    │   ├── delta-composer.ts      ← composeUnitView(baseStats, statModifiers, unitGains)
    │   ├── delta-composer.test.ts
    │   ├── owb-parser.ts          ← parseOwbExport() — isolated module
    │   ├── owb-parser.test.ts
    │   ├── auth.ts                ← getSession(), createSession(), deleteSession(), loginPlayer() — session/cookie ONLY
    │   ├── middleware.ts          ← authMiddleware, armyOwnerMiddleware — import-protected (dynamic import of auth.ts)
    │   ├── types.ts               ← Shared types: ServerResult<T>
    │   ├── validators.ts          ← Pure Zod schemas (client-safe)
    │   └── __fixtures__/
    │       └── owb-sample.txt     ← Copy of docs/army_example.txt for tests
    └── routes/
        ├── __root.tsx             ← Root layout: QueryClientProvider, ErrorBoundary, TabBar, session check → redirect to login
        ├── index.tsx              ← Campaign view (home)
        ├── login.tsx              ← Login page (unauthenticated)
        ├── references.tsx         ← Static reference tables — imports from lib/constants.ts
        ├── armies/
        │   ├── index.tsx          ← Army list (all armies)
        │   └── $armyId.tsx        ← Army detail (timeline + unit cards)
        └── match/
            ├── new.tsx            ← Match creation (select opponent)
            └── $matchId/
                └── post-match.tsx ← Post-match route — mounts PostMatchWizard
```

## Architectural Boundaries

**Auth Boundary:**
- `src/lib/auth.ts` is the ONLY module that reads/writes sessions and cookies (`getSession`, `createSession`, `deleteSession`, `loginPlayer`)
- `src/lib/middleware.ts` exports `authMiddleware` and `armyOwnerMiddleware` — all routes import from here
- `middleware.ts` uses dynamic import of `auth.ts` inside `.server()` to avoid leaking server-only imports into the client bundle (TanStack Start import-protection pattern)
- **NEVER** import `authMiddleware` from `auth.ts` or define it locally in a route file — always import from `middleware.ts`
- No route file directly accesses session cookies or checks ownership inline

**Data Access Boundary:**
- `src/db/` is the ONLY directory that imports `drizzle-orm` table definitions (`pgTable`, `text`, `boolean`…) or the `db` client
- Route server functions access the DB exclusively via named functions in `src/db/queries/` — never by importing `db` or `drizzle-orm` directly in a route file
- Complex/reusable queries: extracted to named functions in `src/db/queries/`
- Domain logic in `src/lib/` receives data as arguments — never imports `db` directly

**Domain Logic Boundary:**
- `src/lib/constants.ts` holds ALL static campaign data (XP thresholds, 2D6 tables, improvement lists)
- `src/lib/xp-calculator.ts` and `src/lib/delta-composer.ts` are pure functions with zero side effects
- They take data in, return computed results — no DB access, no session access
- ALL XP/tier/delta logic lives here — components and routes MUST import, never re-implement
- `src/routes/references.tsx` imports from `lib/constants.ts` — single source of truth for campaign rules

**OWB Parser Boundary:**
- `src/lib/owb-parser.ts` is a standalone module with no imports from the rest of the app
- Input: raw text string → Output: structured army data (typed)
- Replaceable without impacting any other module (NFR9)

**UI Boundary:**
- `src/components/ui/` — shadcn primitives only, never modified directly (regenerated via CLI)
- `src/components/*.tsx` — custom domain components, import from `ui/` and `src/lib/`
- Data reads: components receive data via route loaders and TanStack Query props
- Data writes: components call mutations via `useMutation` wrapping a server function
- Post-match wizard: decomposed into step sub-components in `src/components/post-match/`

**Critical Integration Point — `__root.tsx`:**
- Mounts `QueryClientProvider`, global `ErrorBoundary`, `TabBar`, and `Toaster`
- Checks session state and redirects unauthenticated users to `/login`
- Shows `WelcomeModal` on first login (FR3)
- Any agent modifying this file must be aware it affects the entire app

## Requirements to Structure Mapping

**FR Category → Files:**

| FR Category | Route Files | Components | Lib | DB |
|---|---|---|---|---|
| Auth & Accounts (FR1–7) | `login.tsx`, `__root.tsx` | `welcome-modal.tsx` | `auth.ts` | `players`, `sessions` |
| Army Import (FR8–10) | `armies/index.tsx` (admin) | — | `owb-parser.ts`, `validators.ts` | `armies`, `units`, `sub_profiles` |
| Unit Cards (FR11–14) | `armies/$armyId.tsx` | `unit-card.tsx` | `delta-composer.ts`, `constants.ts` | `units`, `sub_profiles`, `stat_modifiers`, `unit_gains` |
| Timeline & Matches (FR15–20) | `index.tsx`, `armies/$armyId.tsx`, `match/new.tsx` | `timeline-entry.tsx`, `action-chip.tsx`, `create-match-fab.tsx` | — | `matches`, `match_participants` |
| Post-Match Flow (FR21–29) | `match/$matchId/post-match.tsx` | `post-match/*.tsx`, `tier-up-screen.tsx` | `xp-calculator.ts`, `delta-composer.ts`, `constants.ts` | `stat_modifiers`, `unit_gains` |
| References (FR30–34) | `references.tsx` | `ref-table.tsx` | `constants.ts` | — (static) |

**Cross-Cutting Concerns → Files:**

| Concern | Location |
|---|---|
| Authorization | `src/lib/auth.ts` → middleware used by all protected routes |
| XP tier logic | `src/lib/xp-calculator.ts` → post-match flow + unit card display |
| Delta composition | `src/lib/delta-composer.ts` → unit card display + army detail |
| Campaign rules data | `src/lib/constants.ts` → references view + xp-calculator + post-match flow |
| Validation schemas | `src/lib/validators.ts` → shared between TanStack Form (client) and server functions |
| Reusable queries | `src/db/queries/` → army detail, timeline, post-match data loading |

## Data Flow

```
[OWB text] → owb-parser.ts → [Structured Army Data]
                                      ↓
                              db.insert (armies, units, sub_profiles)
                                      ↓
[Route Loader] → db/queries/ → delta-composer.ts → [ComposedUnitView] → UnitCard
                                                                              ↑
[Post-Match Flow] → xp-calculator.ts → tier detection → improvement choice
                  → db.insert (stat_modifiers, unit_gains)
                  → invalidateQueries(['armies', armyId])
```

## Development Workflow

- **Dev server:** `pnpm dev` — Vite HMR + Nitro, hot reload on file changes
- **DB push (dev):** `pnpm drizzle-kit push` — applies schema changes directly
- **DB migrate (prod):** `pnpm drizzle-kit generate` then `pnpm drizzle-kit migrate`
- **Seed:** `pnpm tsx src/db/seed.ts` — populates dev DB via real OWB parser
- **Test:** `pnpm vitest` (unit/integration), `pnpm playwright test` (E2E)
- **Build:** `pnpm build` → Nitro output for Railway deployment
