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

## Story 1.5: Player Logout

As a player,
I want to log out of the app,
So that I can end my session and return to the login page.

**Acceptance Criteria:**

**Given** I am authenticated,
**When** I tap the "Se déconnecter" action (in the profile/header area),
**Then** my session cookie is cleared, the `sessions` table row is deleted, and I am redirected to /login

**Given** I am on /login after logout,
**When** I navigate back (browser back button),
**Then** I am redirected back to /login (session is gone, protected routes reject)

**Given** I am a guest (isGuest session),
**When** I tap "Se connecter" (same location as "Se déconnecter"),
**Then** my guest session is cleared and I am redirected to /login

*No new tables. Extends: `sessions` table (story 1.2).*

---

## Story 1.6: Admin — Player Account List & Delete

As Ben (admin),
I want to view all player accounts and delete them if needed,
So that I can manage campaign participants throughout the season.

**Acceptance Criteria:**

**Given** I am authenticated as admin,
**When** I open the profile/session menu (same area as "Se déconnecter"),
**Then** an "Administration" link is rendered below "Se déconnecter"
— this link is absent from the DOM entirely for non-admin players and guests

**Given** I tap the "Administration" link,
**When** the admin section loads,
**Then** I see the account creation form (from story 1.4) AND a list of all players (username, displayName, isAdmin flag, created_at)
— the ghost player (isGuest = true) is excluded from this list

**Given** I am viewing the player list,
**When** I tap "Delete" on a player account,
**Then** a confirmation is required before deletion proceeds

**Given** I confirm deletion of a player account,
**When** the deletion is processed,
**Then** the player row is removed from `players`, all associated `sessions` rows are deleted, and the player list refreshes

**Given** I attempt to delete my own admin account,
**Then** the action is rejected server-side with an error message (cannot self-delete)

*No new tables. Extends admin section from story 1.4.
Navigation entry point: profile/session menu, below "Se déconnecter", admin-only — absent from DOM for all other roles.*

---

## Story 1.7: Guest Access (Read-Only)

As an unauthenticated visitor,
I want to browse the campaign in read-only mode,
So that I can follow the campaign without needing an account.

**Acceptance Criteria:**

**Given** I am on /login with no active session,
**When** the page renders,
**Then** a text link "Continuer en tant qu'invité" (blue, below the login form) is visible

**Given** I click "Continuer en tant qu'invité",
**When** the action is processed,
**Then** a session is created in `sessions` pointing to the ghost player (players.isGuest = true), a session cookie is set, and I am redirected to the Campaign view (/)

**Given** I have an active guest session,
**When** I navigate the app,
**Then** all three tabs (Campagne, Armées, Références) are accessible and the Campaign view displays an empty match history

**Given** I have an active guest session,
**When** any write action is attempted (match creation, army edit, profile update, admin),
**Then** the action is blocked — write UI elements (FAB, edit buttons, forms) are absent from the DOM; server functions reject with 401

**Given** I have an active session (any role),
**When** any view renders,
**Then** an identity indicator is displayed top-left:
- player.isGuest === true → "Invité"
- player.isAdmin === true → "Admin"
- otherwise → player.displayName

**Given** I have an active guest session,
**When** I open the profile/session menu,
**Then** I see "Se connecter" in place of "Se déconnecter"
— the "Administration" link is absent from the DOM

**Given** I tap "Se connecter" as a guest,
**When** the action is processed,
**Then** my guest session is cleared and I am redirected to /login

**Given** I am on a write route (/match/new, /admin, etc.) with a guest or no session,
**When** the route loads,
**Then** I am redirected to /login

*Schema change: `players.is_guest boolean NOT NULL DEFAULT false` added.
Ghost player seeded at DB init (username: '__guest__', displayName: 'Invité', isGuest: true, isAdmin: false).
sessions.player_id remains NOT NULL with FK intact — guest sessions point to the ghost player ID.
Never use session === null as proxy for guest — always check player.isGuest.*

---
