# Story 1.1: Project Scaffolding & Deployment Pipeline

Status: review

## Story

As a developer,
I want the TanStack Start project initialized with all required add-ons and deployed to Railway with a CI/CD pipeline,
so that the team can develop and ship features on a stable, production-ready foundation.

## Acceptance Criteria

**AC1 — TanStack CLI initialization:**
Given the TanStack CLI is available,
When `npx @tanstack/cli create campaign_tow --add-ons drizzle,shadcn,tanstack-query,form,eslint,railway --package-manager pnpm` is run,
Then the project structure matches the target directory layout with Drizzle, shadcn/ui, TanStack Query, TanStack Form, ESLint, and Railway configured.

**AC2 — Additional dev dependencies:**
Given the project is initialized,
When Vitest, TanStack Form + Zod adapter, and Playwright are added as dev dependencies,
Then `pnpm test` runs and passes with a placeholder test, and `pnpm build` succeeds.

**AC3 — GitHub Actions CI pipeline:**
Given the project exists on GitHub,
When a PR is opened,
Then GitHub Actions runs lint → typecheck → vitest in sequence and reports pass/fail status on the PR.

**AC4 — Railway auto-deploy:**
Given the main branch receives a push,
When Railway detects the change,
Then the app is automatically deployed and accessible via HTTPS at the Railway-provided URL.

**AC5 — Railway environment variables:**
Given the app is deployed on Railway,
When `DATABASE_URL`, `SESSION_SECRET`, and `ADMIN_PASSWORD_HASH` are set as Railway env vars,
Then the Drizzle DB connection is verified healthy at app startup (no `.env` files committed to repo).

**AC6 — Design system bootstrap:**
Given the design system is needed,
When `src/styles/globals.css` is configured with palette CSS custom properties and Cinzel + Inter woff2 font files are placed in `public/fonts/`,
Then all custom color tokens and font families are available throughout the app.

## Tasks / Subtasks

- [x] Task 1 — Initialize TanStack Start project (AC1)
  - [x] Run: `npx @tanstack/cli create campaign_tow --add-ons drizzle,shadcn,tanstack-query,form,eslint,railway --package-manager pnpm`
  - [x] Verify generated structure matches architecture `src/routes/`, `src/db/`, `src/components/ui/` layout
  - [x] Verify `package.json` has `lint`, `format`, `check` scripts (provided by `eslint` add-on)
  - [x] Verify `nixpacks.toml` was generated (provided by `railway` add-on)
  - [x] Commit initial scaffold as first commit on `main`

- [x] Task 2 — Add missing dev dependencies (AC2)
  - [x] Add Vitest: already included by CLI scaffold (vitest 3.2.4, @vitejs/plugin-react 5.1.4)
  - [x] Create `vitest.config.ts` (see Dev Notes for config)
  - [x] **Zod version check (CRITICAL):** drizzle-zod 0.8.3 supports `^3.25.0 || ^4.0.0` — compatible with zod v4. `@tanstack/zod-form-adapter` 0.42.1 only supports `^3.x` — deferred to story 1.2+ when forms are needed.
  - [x] Add `drizzle-zod` only (zod v4 compatible): `pnpm add drizzle-zod`
  - [x] Add Playwright: `pnpm add -D @playwright/test && npx playwright install`
  - [x] Create `playwright.config.ts` (see Dev Notes for config)
  - [x] Write one placeholder Vitest test (`src/lib/placeholder.test.ts`) asserting `true === true`
  - [x] Verify `pnpm test` passes and `pnpm build` succeeds

- [x] Task 3 — GitHub Actions CI pipeline (AC3)
  - [x] Create `.github/workflows/ci.yml` (see Dev Notes for full YAML)
  - [x] Pipeline steps: lint → typecheck → vitest (sequential, fail-fast)
  - [x] Playwright E2E runs only if all previous steps pass
  - [ ] Open a test PR and confirm status checks appear (manual — requires GitHub push)

- [ ] Task 4 — Railway deployment setup (AC4)
  - [ ] Create Railway project and connect GitHub repo
  - [ ] Enable auto-deploy from `main` branch
  - [ ] Provision Railway PostgreSQL plugin
  - [ ] Verify app is accessible at Railway HTTPS URL after first deploy

- [x] Task 5 — Configure Railway environment variables (AC5)
  - [ ] Set `DATABASE_URL` (from Railway PostgreSQL plugin — copy from Railway dashboard)
  - [ ] Set `SESSION_SECRET` (generate a strong random string, e.g. `openssl rand -hex 32`)
  - [ ] Set `ADMIN_PASSWORD_HASH` (bcrypt hash of initial admin password — see Dev Notes)
  - [x] Ensure `.env.example` lists all three vars with placeholder values (NO actual secrets)
  - [x] Add `.env` and `.env.local` to `.gitignore`
  - [x] Add a startup DB health check (see Dev Notes)

- [x] Task 6 — Design system bootstrap (AC6)
  - [x] Download Cinzel woff2 files (weights 600, 700) → `public/fonts/`
  - [x] Download Inter woff2 files (weights 400, 500, 700) → `public/fonts/`
  - [x] Configure `@font-face` rules and CSS custom properties in `src/styles/globals.css` (see Dev Notes for complete token set)
  - [x] Verify tokens are accessible in a test component via Tailwind or inline CSS

## Dev Notes

### Tech Stack (MANDATORY — do not deviate)

| Concern | Choice | Notes |
|---|---|---|
| Framework | TanStack Start v1 RC | File-based routing via TanStack Router. Check official docs — RC may have breaking changes. |
| Language | TypeScript (strict mode) | Provided by starter |
| Runtime | React 19 + React Compiler | Provided by starter |
| Bundler | Vite + Nitro | Vite for dev/build, Nitro for server runtime on Railway |
| Styling | Tailwind CSS v4 + shadcn/ui | Tailwind installed via shadcn add-on |
| ORM | Drizzle ORM + drizzle-kit | Added via starter add-on |
| Database | PostgreSQL (Railway plugin) | Schema managed by Drizzle. `drizzle-kit push` in dev, `drizzle-kit generate` + `drizzle-kit migrate` in prod |
| State | TanStack Query (server) + React useState (local) | No Zustand, no Redux |
| Forms | TanStack Form + Zod adapter | shadcn UI primitives for rendering; NOT shadcn Form component |
| Validation | Zod + drizzle-zod | Single schema source — Drizzle table → Zod → TanStack Form |
| Testing (unit) | Vitest | NOT included in starter — add manually |
| Testing (E2E) | Playwright | NOT included in starter — add manually |
| Package manager | pnpm | Always use `pnpm`, never npm or yarn |
| Hosting | Railway | Node.js Nitro runtime + PostgreSQL plugin |
| CI/CD | GitHub Actions + Railway auto-deploy | PR checks, then Railway deploys on merge to main |

### TanStack CLI — Commandes utiles pendant l'implémentation

Le CLI fournit des commandes de recherche de documentation à utiliser pendant le dev :

```bash
# Rechercher dans la doc TanStack Start (React)
npx @tanstack/cli search-docs "server functions" --library start --framework react
npx @tanstack/cli search-docs "middleware" --library start --framework react --json

# Récupérer une page de doc spécifique
npx @tanstack/cli doc start framework/react/guide/data-loading
npx @tanstack/cli doc router framework/react/guide/file-based-routing

# Voir les add-ons disponibles
npx @tanstack/cli create --list-add-ons
npx @tanstack/cli create --addon-details drizzle --json

# Explorer l'écosystème
npx @tanstack/cli ecosystem --category database
npx @tanstack/cli libraries --json
```

Ces commandes permettent d'obtenir la documentation la plus à jour sur TanStack Start (encore en RC) sans se fier aux connaissances potentiellement périmées du modèle.

### TanStack Start v1 RC — Critical Notes

- TanStack Start est en RC — utiliser `npx @tanstack/cli search-docs` pour la doc à jour
- Server functions use `createServerFn()` — co-located in route files, NOT in a separate `server/` directory
- Middleware uses `createMiddleware()` from `@tanstack/start` — see `src/lib/auth.ts` pattern in later stories
- File-based routing: routes live in `src/routes/`, root layout in `src/routes/__root.tsx`
- The `app.config.ts` is the TanStack Start config (equivalent to `vite.config.ts` in plain Vite projects)

### Add-ons inclus dans la commande `create` — Ce qu'ils fournissent

| Add-on | Ce qui est auto-configuré | Ce qu'il reste à faire |
|---|---|---|
| `drizzle` | `drizzle.config.ts`, `src/db/schema.ts`, `src/db/index.ts` | Ajouter `drizzle-zod`, définir les tables (story 1.2+) |
| `shadcn` | `src/components/ui/`, Tailwind CSS v4 | Ajouter composants via `npx shadcn@latest add <component>` |
| `tanstack-query` | `QueryClientProvider` dans `__root.tsx` | — |
| `form` | `@tanstack/react-form` + `zod` v4 installés | Vérifier compat zod v4 / drizzle-zod (voir ci-dessous) |
| `eslint` | ESLint + Prettier, scripts `lint`/`format`/`check`, `eslint.config.js`, `prettier.config.js` | — |
| `railway` | `nixpacks.toml`, script `start: "node .output/server/index.mjs"` | Connecter le repo GitHub dans Railway dashboard |

### Zod v4 — Point critique

L'add-on `form` installe `zod: "^4.3.6"`. Avant d'ajouter `drizzle-zod` :
1. Vérifier la version de `drizzle-zod` compatible avec zod v4 : `npx @tanstack/cli search-docs "drizzle zod" --library start`
2. Si `drizzle-zod` n'est pas encore compatible zod v4 : `pnpm add zod@^3` (downgrade) + `pnpm add @tanstack/zod-form-adapter`
3. Si compatible : `pnpm add drizzle-zod` suffit

### Project Structure to Create

The scaffolded project MUST match this exact layout (partial — only what story 1.1 establishes):

```
campaign_tow/
├── README.md
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── app.config.ts                  ← TanStack Start config (from starter)
├── drizzle.config.ts              ← Drizzle Kit config (from starter)
├── vitest.config.ts               ← ADD manually
├── playwright.config.ts           ← ADD manually
├── .env.example                   ← ADD: DATABASE_URL=, SESSION_SECRET=, ADMIN_PASSWORD_HASH=
├── .gitignore                     ← ensure .env, .env.local are listed
├── .github/
│   └── workflows/
│       └── ci.yml                 ← ADD manually
├── public/
│   └── fonts/
│       ├── cinzel-600.woff2
│       ├── cinzel-700.woff2
│       ├── inter-400.woff2
│       ├── inter-500.woff2
│       └── inter-700.woff2
├── e2e/
│   └── (placeholder — full specs in later stories)
├── drizzle/
│   └── migrations/               ← empty for now; populated in story 1.2+
└── src/
    ├── styles/
    │   └── globals.css            ← ADD palette tokens + font-face rules
    ├── components/
    │   ├── ui/                    ← shadcn primitives (from starter)
    │   └── (custom components — added in later stories)
    ├── db/
    │   ├── schema.ts              ← placeholder (tables added in story 1.2)
    │   └── index.ts               ← DB connection (may be from starter — verify)
    ├── lib/
    │   ├── placeholder.test.ts    ← ADD: single passing Vitest test
    │   └── (other modules — added in later stories)
    └── routes/
        ├── __root.tsx             ← from starter — do NOT modify in this story
        ├── index.tsx              ← from starter
        └── (other routes — added in later stories)
```

**Key rules:**
- Server functions: co-located in route files via `createServerFn()` — NEVER a separate `server/` dir
- Shared business logic: always in `src/lib/` — never in components or route files
- Unit tests: co-located with source (`owb-parser.test.ts` next to `owb-parser.ts`)
- E2E tests: root-level `e2e/` directory

### vitest.config.ts (recommended)

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
```

### playwright.config.ts (recommended)

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  },
  projects: [
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
})
```

### .github/workflows/ci.yml

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: latest

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Unit tests
        run: pnpm test

      # E2E only when all above pass (sequential by default)
      # - name: E2E tests
      #   run: pnpm playwright test
      # (Uncomment once E2E scaffold is ready in a later story)
```

Note: Confirm that `pnpm lint` and `pnpm typecheck` scripts exist in `package.json` after scaffolding. Add them if missing:
- Lint: `eslint . --ext .ts,.tsx`
- Typecheck: `tsc --noEmit`

### globals.css — Palette CSS Custom Properties

Configure `src/styles/globals.css` with these exact tokens:

```css
@import "tailwindcss";

/* === Fonts === */
@font-face {
  font-family: 'Cinzel';
  src: url('/fonts/cinzel-600.woff2') format('woff2');
  font-weight: 600;
  font-display: swap;
}
@font-face {
  font-family: 'Cinzel';
  src: url('/fonts/cinzel-700.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-400.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-500.woff2') format('woff2');
  font-weight: 500;
  font-display: swap;
}
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-700.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}

/* === Palette tokens === */
:root {
  /* Backgrounds */
  --color-bg: #f1eade;
  --color-surface: #fffbf5;
  --color-border: #e0d5c8;
  --color-separator: #dfd1bf;

  /* Text */
  --color-text-primary: #171310;
  --color-text-secondary: #6b5f52;
  --color-text-muted: #9a8d7f;
  --color-section-label: #938677;

  /* Brand / UI */
  --color-brand: #334155;
  --color-brand-dark: #1e293b;
  --color-tab-active-bg: #dfe8f4;

  /* Semantic — XP tiers / highlights */
  --color-gold: #d4a843;
  --color-bronze: #cd7f32;
  --color-silver: #9aa0a6;
  --color-neutral: #9ca3af;

  /* Semantic — results / deltas */
  --color-bonus: #2d7a3a;
  --color-bonus-bg: #edf8ef;
  --color-bonus-border: #bfe0c6;
  --color-malus: #b82c2c;
  --color-malus-bg: #fdf0f0;
  --color-malus-border: #efc2c2;

  /* Semantic — match outcomes */
  --color-victory-bg: #edf8ef;
  --color-victory-text: #2d7a3a;
  --color-victory-border: #bfe0c6;
  --color-defeat-bg: #fdf0f0;
  --color-defeat-text: #b82c2c;
  --color-defeat-border: #efc2c2;
  --color-draw-bg: #f8f2e3;
  --color-draw-text: #8a6a10;
  --color-draw-border: #ead9a8;

  /* Semantic — info / invitations */
  --color-info: #2a5ab8;

  /* Stats bar background */
  --color-stats-bg: #f3ebdf;

  /* Font families */
  --font-display: 'Cinzel', serif;
  --font-body: 'Inter', sans-serif;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text-primary);
  font-family: var(--font-body);
}
```

### DB Startup Health Check (AC5)

In `src/db/index.ts`, after establishing the Drizzle connection, add a lightweight health check that logs a warning on startup if `DATABASE_URL` is missing or the connection fails. This prevents silent failures at deploy time:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool)

// Startup health check
pool.query('SELECT 1').catch((err) => {
  console.error('[DB] Connection health check failed:', err.message)
  // Do NOT throw — app should still start, Railway will show the log
})
```

Note: The exact Drizzle connection pattern depends on the starter output. If the starter already provides a `src/db/index.ts`, adapt rather than replace it.

### ADMIN_PASSWORD_HASH — How to Generate

This hash is needed for story 1.2 (login), but the env var must exist at deploy time. Generate a placeholder now:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('change-me-admin', 12).then(h => console.log(h))"
```

Or use an online bcrypt generator (rounds = 12). Store the result in Railway env vars only — never in code or `.env`.

### Naming & Conventions (MANDATORY — enforced for all stories)

| Scope | Convention | Examples |
|---|---|---|
| DB tables | snake_case, plural | `players`, `armies`, `sub_profiles` |
| DB columns | snake_case | `player_id`, `army_name`, `created_at` |
| DB foreign keys | `<singular_table>_id` | `player_id`, `army_id` |
| Variables / functions | camelCase | `getArmyById`, `currentPlayer` |
| React components | PascalCase | `UnitCard`, `ActionChip` |
| Types / interfaces | PascalCase | `Player`, `UnitWithDeltas` |
| Constants | UPPER_SNAKE_CASE | `XP_THRESHOLDS_UNIT` |
| File names | kebab-case | `unit-card.tsx`, `action-chip.tsx` |

### Architecture Boundaries (NEVER violate)

- `src/lib/auth.ts` is the ONLY module that reads/writes sessions and cookies
- `src/db/` is the ONLY directory that imports from `drizzle-orm`
- Domain logic in `src/lib/` receives data as arguments — NEVER imports `db` directly
- `src/components/ui/` — shadcn primitives only, NEVER modified directly (regenerated via CLI)
- Server functions MUST use `createMiddleware()` for auth — NEVER inline session checks
- ALL XP/tier/delta logic lives in `src/lib/` — NEVER re-implemented in components

### Error Handling Pattern (for all future server functions)

```typescript
type ServerResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string } }

type ErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR'
```

- Mutations return `ServerResult<T>`
- Loaders (reads) return data directly and throw on error → caught by React error boundary
- Toast (shadcn Sonner) for recoverable errors, error boundary for unrecoverable

### References

- TanStack Start docs: https://tanstack.com/start/latest/docs [Source: architecture/starter-template-evaluation.md#Selected Starter]
- Target directory layout: [Source: architecture/project-structure-boundaries.md#Complete Project Directory Structure]
- Naming conventions: [Source: architecture/implementation-patterns-consistency-rules.md#Naming Patterns]
- Architectural boundaries: [Source: architecture/project-structure-boundaries.md#Architectural Boundaries]
- CI pipeline spec: [Source: architecture/implementation-patterns-consistency-rules.md#Testing Strategy]
- Palette tokens: [Source: _bmad-output/planning-artifacts/ux-mockup.html v4.0]
- Font usage: Cinzel (titles/unit names) + Inter (body/stats/nav) [Source: ux-design-specification/ux-consistency-patterns.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- CLI generates `vite.config.ts` (not `app.config.ts` as noted in Dev Notes — RC changed). Test [1.1-UNIT-001] updated accordingly.
- TanStack CLI scaffold already includes Vitest 3.2.4 — manual install not needed.
- `@tanstack/zod-form-adapter` 0.42.1 does not support zod v4 (only `^3.x`). Deferred to story 1.2+.
- `nixpacks.toml` generated by CLI used `npm` — updated to `pnpm`.
- `drizzle.config.ts` had TS error (url: string | undefined) — fixed with non-null assertion.
- `src/routes/demo/drizzle.tsx` had invalid CSS-in-JS property `focusRing` — removed.
- shadcn `button.tsx` had `import/consistent-type-specifier-style` lint error — added rule override for `src/components/ui/**`.
- `.output/` directory was being linted (build artifacts) — added to eslint ignores.

### Completion Notes List

- TanStack Start project scaffolded with CLI (v0.62.3) using all required add-ons.
- 34 tests pass: 32 ATDD scaffold tests (AC1-AC6) + 2 placeholder tests.
- `pnpm lint` ✅, `pnpm typecheck` ✅, `pnpm build` ✅, `pnpm test` ✅.
- Task 4 (Railway setup) and Railway env var configuration are manual — requires Railway dashboard access.
- `@tanstack/zod-form-adapter` deferred: incompatible with zod v4. Story 1.2 must address form validation approach.
- Google Fonts woff2 files downloaded: Cinzel (600, 700) and Inter (400, 500, 700) are variable font subsets (latin).

### File List

Generated by TanStack CLI scaffold:
- `vite.config.ts`
- `drizzle.config.ts`
- `tsconfig.json`
- `package.json`
- `pnpm-lock.yaml`
- `components.json`
- `eslint.config.js`
- `prettier.config.js`
- `nixpacks.toml`
- `README.md`
- `src/routes/__root.tsx`
- `src/routes/index.tsx`
- `src/routes/about.tsx`
- `src/routes/demo/` (generated demo routes)
- `src/db/schema.ts`
- `src/db/index.ts`
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/slider.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/textarea.tsx`
- `src/lib/utils.ts`
- `src/styles.css`
- `public/` (drizzle.svg, favicon.ico, logos, manifest, robots.txt)

Added manually (story tasks):
- `vitest.config.ts`
- `playwright.config.ts`
- `.github/workflows/ci.yml`
- `.env.example`
- `src/lib/placeholder.test.ts`
- `src/styles/globals.css`
- `public/fonts/cinzel-600.woff2`
- `public/fonts/cinzel-700.woff2`
- `public/fonts/inter-400.woff2`
- `public/fonts/inter-500.woff2`
- `public/fonts/inter-700.woff2`

Modified:
- `nixpacks.toml` — updated from npm to pnpm
- `package.json` — added `typecheck` script; drizzle-zod and @playwright/test added
- `drizzle.config.ts` — fixed TS error (DATABASE_URL non-null assertion)
- `src/db/index.ts` — added Pool + startup DB health check
- `eslint.config.js` — added .output/ ignore, shadcn ui override
- `src/routes/demo/drizzle.tsx` — removed invalid CSS-in-JS property
- `tests/integration/scaffold.test.ts` — un-skipped all 32 tests, updated [1.1-UNIT-001] to check vite.config.ts

### Change Log

- 2026-03-07: Story 1.1 implemented — TanStack Start scaffold, dev deps, CI pipeline, Railway config files, design system bootstrap. 34 tests pass. Tasks 4 and Railway env var secrets are manual (Railway dashboard).
