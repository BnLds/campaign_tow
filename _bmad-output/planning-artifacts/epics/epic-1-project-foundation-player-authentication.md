# Epic 1: Project Foundation & Player Authentication

Players can securely access the app. Ben can manage player accounts. The project infrastructure (scaffolding, database, auth, CI/CD, deployment) is in place and operational.

## Story 1.1: Project Scaffolding & Deployment Pipeline

As a developer,
I want the TanStack Start project initialized with all required add-ons and deployed to Railway with a CI/CD pipeline,
So that the team can develop and ship features on a stable, production-ready foundation.

**Acceptance Criteria:**

**Given** the TanStack CLI is available,
**When** `npx @tanstack/cli create campaign_tow --add-ons drizzle,shadcn,tanstack-query --package-manager pnpm` is run,
**Then** the project structure matches the target directory layout with Drizzle, shadcn/ui, and TanStack Query configured

**Given** the project is initialized,
**When** Vitest, TanStack Form + Zod adapter, and Playwright are added as dev dependencies,
**Then** `pnpm test` runs and passes with a placeholder test, and `pnpm build` succeeds

**Given** the project exists on GitHub,
**When** a PR is opened,
**Then** GitHub Actions runs lint → typecheck → vitest in sequence and reports pass/fail status on the PR

**Given** the main branch receives a push,
**When** Railway detects the change,
**Then** the app is automatically deployed and accessible via HTTPS at the Railway-provided URL

**Given** the app is deployed on Railway,
**When** DATABASE_URL, SESSION_SECRET, and ADMIN_PASSWORD_HASH are set as Railway env vars,
**Then** the Drizzle DB connection is verified healthy at app startup (no .env files committed to repo)

**Given** the design system is needed,
**When** globals.css is configured with palette CSS tokens and Cinzel + Inter woff2 fonts are placed in public/fonts/,
**Then** all custom color tokens and fonts are available throughout the app

---

## Story 1.2: Player Login & Session Management

As a player,
I want to log in with my username and password,
So that I can securely access the campaign app.

**Acceptance Criteria:**

**Given** I am not authenticated,
**When** I navigate to any protected route,
**Then** I am redirected to the /login page

**Given** I am on the /login page,
**When** I enter a valid username and password and submit,
**Then** an HTTP-only signed session cookie is created, the `sessions` table is updated, and I am redirected to the Campaign view (/)

**Given** I am on the /login page,
**When** I enter an invalid username or incorrect password,
**Then** an error message is displayed and no session cookie is created

**Given** I am authenticated,
**When** any protected server function is called,
**Then** my session is verified server-side via `src/lib/auth.ts` before the action is executed

**Given** I am authenticated and own army A,
**When** a request attempts to mutate army B's data,
**Then** `armyOwnerMiddleware` rejects the request server-side and returns an authorization error

*Tables created by this story: `players` (id, username, passwordHash, displayName, isAdmin, hasSeenWelcome), `sessions` (id, playerId, expiresAt)*

---

## Story 1.3: First-Login Welcome Modal & Display Name

As a player logging in for the first time,
I want to see a welcome message and be able to set my display name,
So that I understand how the app works and can identify myself correctly in the campaign.

**Acceptance Criteria:**

**Given** this is my first login (hasSeenWelcome = false),
**When** the Campaign view loads after authentication,
**Then** the WelcomeModal appears explaining the app, inviting me to update my display name, and showing the admin contact info

**Given** the WelcomeModal is open,
**When** I dismiss it,
**Then** hasSeenWelcome is set to true in the `players` table and the modal does not appear on subsequent logins

**Given** I am logged in,
**When** I submit a new display name via the profile form,
**Then** my displayName is updated in the `players` table and reflected throughout the app

**Given** I am logged in,
**When** I submit an empty or whitespace-only display name,
**Then** a validation error is shown and no update is made

---

## Story 1.4: Admin — Player Account Creation

As Ben (admin),
I want to create player accounts,
So that all campaign participants can log in with their own credentials.

**Acceptance Criteria:**

**Given** I am logged in as admin (isAdmin = true),
**When** I navigate to the admin section,
**Then** I see a form to create a new player account

**Given** I am on the create player form,
**When** I enter a valid username and temporary password and submit,
**Then** a new player record is created with isAdmin = false and a bcrypt-hashed password stored in `players.passwordHash`

**Given** a newly created player account,
**When** that player logs in with the temporary credentials,
**Then** they can access the app and the WelcomeModal appears prompting them to update their display name

**Given** I am logged in as a non-admin player,
**When** I attempt to access the admin section,
**Then** I am denied access (redirect or 403)

**Given** I attempt to create a player with a username that already exists,
**Then** a validation error is shown and no duplicate account is created

---
