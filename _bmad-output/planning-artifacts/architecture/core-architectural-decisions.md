# Core Architectural Decisions

## Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data model: Typed columns for stats + separate delta table (Option A)
- Auth: Server-side cookie sessions with bcrypt — no external auth framework
- API: TanStack Start server functions (no separate REST API)

**Important Decisions (Shape Architecture):**
- Validation: Zod with drizzle-zod for shared client/server schemas
- State management: TanStack Query (server) + React useState (local UI)
- Forms: TanStack Form + Zod adapter for validation
- Deploy: Railway auto-deploy from GitHub + PostgreSQL plugin

**Deferred Decisions (Post-MVP):**
- PWA / Service Worker configuration
- Advanced caching strategy
- Monitoring / error tracking (Sentry or similar)
- Self-service OWB import flow

## Data Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Database | PostgreSQL | Relational model fits domain (armies → units → matches → evolutions); decided in PRD |
| ORM | Drizzle ORM | Type-safe, lightweight, excellent PostgreSQL support; user preference |
| Validation | Zod + drizzle-zod | Single schema source: Drizzle table → Zod schema → TanStack Form validation. Shared between server and client. |
| Migrations | Drizzle Kit | Built-in with Drizzle. `drizzle-kit push` in dev, generated SQL migrations for prod. |
| Stat storage | Typed columns (text) | 9 columns per sub-profile (m, cc, ct, f, e, pv, i, a, cd) stored as text to accommodate dice expressions (3D6), modifiers ((+1)), and empty values (–). |
| Campaign stat changes | `stat_modifiers` table | Per-stat numeric deltas (+1, -1). Source tracking (tier_up, injury, destruction, direct_edit). Temporary flag for next-battle-only injuries. Summable for composition. |
| Campaign non-stat changes | `unit_gains` table | Abilities (vétéran, mur de bouclier...), champion, banner, magic level. Text-based entries with active/inactive state for gains and losses. |
| Base stat immutability | Preserved | OWB import data in `sub_profiles` never mutated. All changes stored in `stat_modifiers` + `unit_gains`. |

## Authentication & Security

| Decision | Choice | Rationale |
|---|---|---|
| Auth method | Server-side cookie sessions | Simple, secure, no client-side token management. HTTP-only signed cookie + sessions table in PostgreSQL. |
| Password hashing | bcrypt | Industry standard; required by NFR4 |
| Authorization | Army ownership check per mutation | `army.playerId === session.playerId` verified server-side on every write. Admin flag (`isAdmin` boolean) for import/account management. |
| Session storage | PostgreSQL sessions table | No Redis needed at this scale. Session lookup on each authenticated request. |
| Transport security | HTTPS (Railway default) | NFR5 compliance; Railway provides TLS termination. |

## API & Communication Patterns

| Decision | Choice | Rationale |
|---|---|---|
| API style | TanStack Start server functions | Type-safe end-to-end, co-located with routes, no separate API layer to maintain. Eliminates REST boilerplate for a single-client app. |
| Error handling | Typed return values + error boundary | Business errors (authorization, validation) returned as typed results, not thrown. System errors caught by React error boundary. |
| Data fetching | TanStack Query loaders | Route loaders prefetch data; TanStack Query manages cache, invalidation, and loading states. |

## Frontend Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Server state | TanStack Query | Included via starter add-on. Handles caching, background refresh, optimistic updates. |
| Local UI state | React useState | No global store needed — UI state is localized (modal open/close, local toggles). |
| Forms | TanStack Form + Zod adapter | Ecosystem consistency with TanStack Start/Router/Query. Zod schemas shared with server validation (drizzle-zod). shadcn/ui primitives (Input, Select, Button) used for rendering — not shadcn Form component. |
| Component organization | `src/components/ui/` (shadcn) + `src/components/` (custom domain) | Clear separation between design system primitives and domain-specific components. |
| Routing | File-based (TanStack Router) | Provided by starter. Routes map to 4 views: Campaign, Army List, Army Detail, References. |

## Infrastructure & Deployment

| Decision | Choice | Rationale |
|---|---|---|
| Hosting | Railway | User preference. Node.js (Nitro) runtime + PostgreSQL plugin. Auto-TLS. |
| Database hosting | Railway PostgreSQL plugin | Co-located with app, managed backups, single `DATABASE_URL` env var. |
| CI/CD | GitHub Actions + Railway auto-deploy | PR checks: lint + typecheck + vitest. Merge to main triggers Railway deploy. |
| Environment config | Railway env vars | `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD_HASH`. No .env files in repo. |

## Decision Impact Analysis

**Implementation Sequence:**
1. Project scaffolding (TanStack CLI + add-ons + TanStack Form)
2. Database schema (Drizzle tables: `players`, `sessions`, `armies`, `units`, `sub_profiles`, `matches`, `match_participants`, `stat_modifiers`, `unit_gains`)
3. Auth system (sessions, login, middleware)
4. OWB parser module (isolated, testable)
5. Domain logic (`constants.ts`, `xp-calculator.ts`, `delta-composer.ts`)
6. Core UI components (UnitCard, TabBar, etc.)
7. Feature routes (Campaign view, Army views, Post-match flow, References)

**Cross-Component Dependencies:**
- Auth middleware must exist before any protected server function
- Drizzle schema + drizzle-zod must be defined before forms can share validation
- OWB parser feeds into army/unit creation — parser module must be testable independently
- UnitCard depends on `composeUnitView()` from `delta-composer.ts` — composes base stats + stat_modifiers + unit_gains at read time
