# Campaign TOW

A web app for a closed club of ~15 players to follow a **Warhammer: The Old World** campaign. It records how each army evolves across battles — unit experience (XP), tier progression, permanent injuries, territories — and turns it into a living, shareable history.

Live instance: **https://old-world-campaign.ben-lds.com**

> This is a private repository. Contributions are by invitation only — see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Philosophy

The app fits into an existing ritual instead of replacing it: the friendly end-of-game calculation on paper stays intact — the app remembers what the players decided. Four ideas drive the product:

- **The app waits for the player.** XP entry is manual and intentional. An out-of-date army is fine — there is no forced synchronisation and no heavy onboarding. The app accepts what a player deposits, when they want.
- **Trust over enforcement.** This is a closed club of people who know each other. Either player can record a match result, evolutions are entered without cross-validation, and the legality of chosen improvements is left to the players — the app guides, it does not police.
- **A narrative timeline, not a spreadsheet.** The central view is a scrollable chronicle of an army's evolution — current state on top, then each past battle with its consequences below.
- **Cross-visibility.** Every player can browse their opponents' armies — current strength, campaign history, tiers crossed — to prepare for a match.

It serves two moments: **reference at the table** during a game (current unit state and rules tables, two taps away) and **campaign log after a game** (a guided, unit-by-unit post-match flow that records XP, character injuries and tier-up improvements).

---

## Tech stack

| Area | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, SSR) |
| Routing / data | TanStack Router, TanStack Query, TanStack Form |
| Database | PostgreSQL 16 + [Drizzle ORM](https://orm.drizzle.team/) |
| Validation | Zod v4 (via Standard Schema) |
| UI | Tailwind CSS v4, shadcn / Radix UI, Lucide icons |
| Auth | Session cookies + bcryptjs |
| Testing | Vitest (unit + integration) |
| Monitoring | Sentry |
| Deployment | Docker Compose + Traefik on a VPS |

Package manager: **pnpm 10.33**. Node: **22+**.

> Code conventions and the architectural rules contributors must follow are documented in [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Getting started (local development)

### Prerequisites

- Node.js 22+
- pnpm 10.33 (`corepack enable` then `corepack use pnpm@10.33`)
- Docker (for the local PostgreSQL database)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example file and fill in the values:

```bash
cp .env.example .env.local
```

Minimum required for local dev:

```dotenv
DATABASE_URL=postgresql://campaign_tow:dev_password@localhost:5432/campaign_tow_dev
SESSION_SECRET=<run: openssl rand -hex 32>
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt hash, 12 rounds, of your admin password>
```

Sentry variables can be left empty in local dev.

### 3. Start the database

The local `docker-compose.yml` provisions a PostgreSQL 16 instance on `localhost:5432`:

```bash
docker compose up -d db
```

### 4. Run migrations and seed the admin user

```bash
pnpm db:migrate
pnpm seed:admin
```

### 5. Start the dev server

```bash
pnpm dev
```

The app runs on **http://localhost:3000**. Log in with the admin credentials you seeded.

---

## Useful scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start the dev server (port 3000) |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build locally |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm typecheck` | Type-check without emitting (`tsc --noEmit`) |
| `pnpm lint` | Lint with ESLint |
| `pnpm format` | Check formatting (Prettier) |
| `pnpm secrets:scan` | Scan Git history for committed secrets with Gitleaks |
| `pnpm secrets:scan:dir` | Scan the current working tree for secrets with Gitleaks |
| `pnpm check` | Auto-fix formatting + lint |
| `pnpm db:generate` | Generate a migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm seed:admin` | Create/refresh the admin account |
| `pnpm db:reset-data` | Reset application data |

---

## Project structure

```
src/
├── routes/          # File-based routes (TanStack Router): armies, match, territories, admin, api…
├── server-fns/      # Server functions (server-side logic callable from the client)
├── db/              # Drizzle schema, queries, seeds (schema.ts, queries/, seed-admin.ts)
├── lib/             # Domain logic, validators, helpers, shared types
├── components/      # UI components (incl. shadcn primitives in components/ui)
├── hooks/           # React hooks
├── integrations/    # Third-party integrations
└── styles.css       # Single CSS entry point (Tailwind v4 + design tokens)

drizzle/             # Generated SQL migrations
docs/                # Campaign rules and army export examples
ops/                 # Production deployment config & runbook (Compose, Traefik)
tests/               # Vitest unit + integration tests
```

### Domain rules

The campaign mechanics live in [`docs/campaign-rules/`](./docs/campaign-rules):

- [`xp_rules.md`](./docs/campaign-rules/xp_rules.md) — how units earn XP and progress through tiers
- [`match_rule.md`](./docs/campaign-rules/match_rule.md) — XP catch-up bonus between mismatched armies

Example army exports (the formats the importer accepts) are in [`docs/examples/`](./docs/examples).

### About `_bmad-output/`

This directory holds design, architecture, UX, and test planning artifacts. It is versioned on purpose to preserve project context. **Do not modify it for ordinary application changes** — only when a PR explicitly concerns design docs or a documented project decision (see CONTRIBUTING.md).

---

## Testing

All tests run with [Vitest](https://vitest.dev/):

```bash
pnpm test
```

Specs live under `tests/` (unit + `tests/integration/`) and `src/**/__tests__/`.

---

## Deployment

Production runs in Docker behind Traefik on a VPS, described by [`ops/docker-compose.prod.yml`](./ops/docker-compose.prod.yml).

The full runbook — Traefik / `docker-socket-proxy` topology, Compose validation, targeted rollout, post-deployment checks, and required environment variables — lives in [`ops/README.md`](./ops/README.md).

---

## Contributing

Contributions are by invitation, via pull request to `main`. Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` before opening a PR. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow.

---

## License

Proprietary — all rights reserved. This code is not licensed for redistribution or use outside the invited contributor context.
