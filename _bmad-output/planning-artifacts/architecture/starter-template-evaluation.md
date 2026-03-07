# Starter Template Evaluation

## Primary Technology Domain

Full-stack web application (SPA mobile-first + server functions + relational DB) based on project requirements analysis.

## Technical Preferences

- **Language:** TypeScript
- **Framework:** TanStack Start (v1 RC) — exploratory choice for the user
- **UI Library:** shadcn/ui (Tailwind CSS based)
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL
- **Testing:** Vitest
- **Deployment:** Railway
- **Package Manager:** pnpm

## Starter Options Considered

| Option | Source | Includes | Verdict |
|---|---|---|---|
| TanStack CLI + add-ons | Official (TanStack team) | Drizzle, shadcn, TanStack Query | **Selected** — minimal, maintained, no unnecessary opinions |
| react-tanstarter | Community (dotnize) | Better Auth, Drizzle, shadcn | Rejected — imposes Better Auth (overkill for ~15 players with simple auth) |
| tss-app | Community (ally-ahmed) | tRPC, Drizzle, Lucia-Auth, shadcn | Rejected — adds tRPC layer (unnecessary with TanStack Start server functions) |

## Selected Starter: TanStack CLI with Official Add-ons

**Rationale for Selection:**
- Official tooling maintained by the TanStack team — most likely to track breaking changes in the RC-to-v1 transition
- Add-ons system provides Drizzle and shadcn integration without imposing auth or routing opinions
- Minimal footprint — auth will be implemented as a simple session-based system (username + password for ~15 players), not requiring a full auth framework
- TanStack Query add-on provides server state management out of the box

**Initialization Command:**

```bash
npx @tanstack/cli create campaign_tow --add-ons drizzle,shadcn,tanstack-query,form,eslint,railway --package-manager pnpm
```

**Add-ons included and what they auto-configure:**

| Add-on | Auto-configured | Remaining manual steps |
|---|---|---|
| `drizzle` | `drizzle.config.ts`, `src/db/schema.ts`, `src/db/index.ts` | Add `drizzle-zod`, define tables (story 1.2+) |
| `shadcn` | `src/components/ui/`, Tailwind CSS v4 | Add components via `npx shadcn@latest add <component>` |
| `tanstack-query` | `QueryClientProvider` in `__root.tsx` | — |
| `form` | `@tanstack/react-form` + **zod v4** installed | Verify `drizzle-zod` compat with zod v4 (see warning below) |
| `eslint` | ESLint + Prettier, `lint`/`format`/`check` scripts, `eslint.config.js`, `prettier.config.js` | — |
| `railway` | `nixpacks.toml`, `start` script (`node .output/server/index.mjs`) | Connect GitHub repo in Railway dashboard |

**Not available as add-ons (manual installation required):**
- Vitest — `pnpm add -D vitest @vitejs/plugin-react` + `vitest.config.ts`
- Playwright — `pnpm add -D @playwright/test && npx playwright install` + `playwright.config.ts`

**⚠ Zod v4 compatibility warning:**
The `form` add-on installs `zod: "^4.3.6"` (zod v4). Before adding `drizzle-zod`, verify it supports zod v4:
- If compatible: `pnpm add drizzle-zod` only
- If incompatible: `pnpm add zod@^3` (downgrade) + `pnpm add @tanstack/zod-form-adapter` manually

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript with React 19 and React Compiler, configured via TanStack Start defaults.

**Styling Solution:**
Tailwind CSS v4 (installed via shadcn add-on), with shadcn/ui component library providing accessible, composable primitives.

**Build Tooling:**
Vite (bundled with TanStack Start), Nitro as the server runtime. Production-optimized builds out of the box.

**Testing Framework:**
Not included by starter — Vitest will be added manually as a dev dependency.

**Code Organization:**
File-based routing via TanStack Router. Server functions co-located with route files. Drizzle schema in dedicated directory.

**Development Experience:**
HMR via Vite, TypeScript strict mode, TanStack DevTools for Router and Query.

**Note:** Project initialization using this command should be the first implementation story.
