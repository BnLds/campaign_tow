# Contribution Guide

This repository is public for transparency, but the project remains maintainer-controlled and proprietary. Contributions are accepted by invitation or explicit maintainer approval, and every change must go through a pull request to `main`.

## Local Setup

Prerequisites:

- Node.js 22+
- pnpm 10.33 via Corepack: `corepack enable` then `corepack use pnpm@10.33`
- Docker, for the local PostgreSQL database

Install dependencies:

```bash
pnpm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Minimum local values:

```dotenv
DATABASE_URL=postgresql://campaign_tow:dev_password@localhost:5432/campaign_tow_dev
SESSION_SECRET=<run: openssl rand -hex 32>
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt hash, 12 rounds, of your admin password>
```

Start the database, apply migrations, seed the admin user, then start the app:

```bash
docker compose up -d db
pnpm db:migrate
pnpm seed:admin
pnpm dev
```

The local app runs on `http://localhost:3000`.

## Technical Context

| Area           | Technology                                                   |
| -------------- | ------------------------------------------------------------ |
| Framework      | [TanStack Start](https://tanstack.com/start) (React 19, SSR) |
| Routing / data | TanStack Router, TanStack Query, TanStack Form               |
| Database       | PostgreSQL 16 + [Drizzle ORM](https://orm.drizzle.team/)     |
| Validation     | Zod v4 (via Standard Schema)                                 |
| UI             | Tailwind CSS v4, shadcn / Radix UI, Lucide icons             |
| Auth           | Session cookies + bcryptjs                                   |
| Testing        | Vitest (unit + integration)                                  |
| Monitoring     | Sentry                                                       |
| Deployment     | Docker Compose + Traefik on a VPS                            |

Package manager: **pnpm 10.33**. Node: **22+**.

## Scripts

| Script                  | Purpose                                          |
| ----------------------- | ------------------------------------------------ |
| `pnpm dev`              | Start the dev server on port 3000                |
| `pnpm build`            | Build the production app                         |
| `pnpm start`            | Run the production build locally                 |
| `pnpm test`             | Run Vitest tests                                 |
| `pnpm typecheck`        | Run TypeScript checks without emitting files     |
| `pnpm lint`             | Run ESLint                                       |
| `pnpm format`           | Check Prettier formatting                        |
| `pnpm check`            | Auto-format and auto-fix lint issues             |
| `pnpm secrets:scan`     | Scan Git history for secrets with Gitleaks       |
| `pnpm secrets:scan:dir` | Scan the working tree for secrets with Gitleaks  |
| `pnpm db:generate`      | Generate a Drizzle migration from schema changes |
| `pnpm db:migrate`       | Apply pending Drizzle migrations                 |
| `pnpm db:studio`        | Open Drizzle Studio                              |
| `pnpm seed:admin`       | Create or refresh the admin account              |
| `pnpm db:reset-data`    | Reset application data                           |

## Pull Request Workflow

1. Create a branch from the latest `main`.
2. Keep the change focused on one issue or one coherent improvement.
3. Add or update tests when behavior changes.
4. Run the relevant checks before opening the PR.
5. Open the PR against `main` and fill in the template.
6. Wait for review and approval from the code owner before merge.

Direct pushes to `main` are reserved for the maintainer and should be blocked by GitHub branch protection.

Recommended checks before opening a PR:

```bash
pnpm secrets:scan:dir
pnpm lint
pnpm typecheck
pnpm test
```

If a command is not locally applicable, mention it in the pull request with the reason.

## Code Conventions

A few principles shape almost every change in this repository. Reviews rely on them, so read them before your first pull request.

- **Type-safe end to end, no REST layer.** Server logic is written as TanStack Start server functions, co-located with routes. There is no separate API to maintain.
- **One schema, shared by client and server.** Drizzle tables generate Zod schemas (`drizzle-zod`) reused by TanStack Form. The server always revalidates; the client is never trusted.
- **Business logic is pure and lives in `src/lib/`.** XP, tier, and delta calculations (`xp-calculator`, `delta-composer`, `owb-parser`) are pure functions covered by unit tests. Never duplicate them in components or routes; import them.
- **Base stats are immutable.** Data imported from OWB is never modified. Campaign changes are stored as composable deltas (`stat_modifiers`, `unit_gains`) and recomposed on read.
- **Database access only through `src/db/queries/`.** Routes and server functions must never import `db`, `drizzle-orm`, or schema tables directly; they call named query functions.
- **Auth middleware comes from `src/lib/middleware.ts`.** Never define it locally in a route; import protection keeps server code out of the client bundle. Army ownership is checked server-side on every write.
- **Typed results for mutations.** Mutations return a discriminated union `ServerResult<T>`; business errors are values, not exceptions. Loaders return data directly and throw to the error boundary.
- **No global store.** TanStack Query manages server state; React `useState` manages local UI state.

Naming: `snake_case` in the database, `camelCase` in code, `PascalCase` for components and types, and `kebab-case` for files.

## Architecture Map

- `src/routes/`: TanStack Router file-based routes, route loaders, API routes, and route-level UI composition.
- `src/server-fns/`: TanStack Start server functions used by client code for authenticated reads and writes.
- `src/db/`: Drizzle setup, schema, migrations-adjacent scripts, seeds, and query modules. Application code should go through `src/db/queries/`.
- `src/lib/`: Shared domain logic, validation, auth helpers, type definitions, and pure calculation functions.
- `src/components/`: Reusable React UI components and feature components. Keep domain rules out of components when they belong in `src/lib/`.
- `src/hooks/`: React hooks shared across routes and components.
- `src/integrations/`: third-party integration setup.
- `drizzle/`: generated SQL migrations.
- `docs/`: campaign rules and army export examples.
- `ops/`: production deployment config and runbook.
- `tests/`: Vitest unit and integration tests.

## Domain Rules

The campaign mechanics live in [`docs/campaign-rules/`](./docs/campaign-rules):

- [`xp_rules.md`](./docs/campaign-rules/xp_rules.md): how units earn XP and progress through tiers.
- [`match_rule.md`](./docs/campaign-rules/match_rule.md): XP catch-up bonus between mismatched armies.

Example army exports, including the formats the importer accepts, are in [`docs/examples/`](./docs/examples).

## Testing

All tests run with Vitest:

```bash
pnpm test
```

Test layout and testing conventions are documented in [tests/README.md](./tests/README.md).

## Deployment

Production runs in Docker behind Traefik on a VPS, described by [`ops/docker-compose.prod.yml`](./ops/docker-compose.prod.yml).

The full runbook, including Traefik, `docker-socket-proxy`, Compose validation, targeted rollout, post-deployment checks, and required environment variables, lives in [`ops/README.md`](./ops/README.md).

### Architecture Documentation

The full details and complete rule set live in:

- [`core-architectural-decisions.md`](./_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md)
- [`implementation-patterns-consistency-rules.md`](./_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md)

> These planning documents predate the move from Railway to the current Docker/VPS deployment and some testing choices. If they diverge, `README.md` is authoritative for deployment and `tests/README.md` is authoritative for testing conventions.

## Documentation And Artifacts

`docs/` contains documentation that is directly useful to contributors and project users.

`_bmad-output/` contains design, architecture, UX, and testing artifacts. This folder is intentionally versioned to preserve project context.

Only modify `_bmad-output/` if the pull request explicitly concerns design documentation, testing artifacts, or a documented project decision. For regular application changes, avoid touching this folder.

## Secrets

Never commit secrets, `.env` files, tokens, SSH keys, database dumps, or production credentials.

Use `.env.example` to document expected environment variables without sensitive values.

If a secret is committed, rotate it immediately and report it privately to the maintainer.
