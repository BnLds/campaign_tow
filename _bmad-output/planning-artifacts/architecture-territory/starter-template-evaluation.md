# Starter Template Evaluation

## Primary Technology Domain

Full-stack web application (brownfield extension of existing SPA).

## Starter Decision: Existing Stack (No Evaluation Needed)

The territory module extends an existing, production-deployed application. The technology stack is already established and validated:

- **Framework:** TanStack Start (React 19, Vite 7, Nitro server)
- **Database:** PostgreSQL + Drizzle ORM
- **UI:** shadcn/ui + Tailwind v4 + custom `cw-*` design tokens
- **Routing:** TanStack Router (file-based)
- **Data fetching:** TanStack React Query
- **Forms:** TanStack Form + Zod v4 (Standard Schema)
- **Auth:** bcryptjs + HTTP-only session cookies + custom middleware chain
- **Testing:** Vitest (unit) + Playwright (E2E)
- **Deployment:** Docker + VPS Ubuntu + Traefik reverse proxy
- **Monitoring:** Sentry

No starter template evaluation is required. All architectural decisions in subsequent steps build on this established foundation.
