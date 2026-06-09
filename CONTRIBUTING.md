# Contribution Guide

This repository is private. Contributions are made by invitation and through pull requests.

## Workflow

1. Create a branch from `main`.
2. Make a targeted change limited to the need being addressed.
3. Run the relevant checks before opening the pull request.
4. Open a pull request against `main` with a clear description.
5. Wait for the maintainer's review and approval before merging.

## Checks

Recommended commands before opening a PR:

```bash
pnpm secrets:scan
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

### Architecture Documentation

The full details and complete rule set live in:

- [`core-architectural-decisions.md`](./_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md)
- [`implementation-patterns-consistency-rules.md`](./_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md)

> These planning documents predate the move from Railway to the current Docker/VPS deployment and some testing choices. If they diverge, the `README.md` sections on Deployment and Testing are authoritative.

## Documentation And Artifacts

`docs/` contains documentation that is directly useful to contributors and project users.

`_bmad-output/` contains design, architecture, UX, and testing artifacts. This folder is intentionally versioned to preserve project context.

Only modify `_bmad-output/` if the pull request explicitly concerns design documentation, testing artifacts, or a documented project decision. For regular application changes, avoid touching this folder.

## Secrets

Never commit secrets, `.env` files, tokens, SSH keys, database dumps, or production credentials.

Use `.env.example` to document expected environment variables without sensitive values.
