# Sprint Change Proposal — Epic 1 Extension
**Date:** 2026-03-13
**Project:** campaign_tow
**Proposed by:** Ben (SM/PO)
**Scope classification:** Minor — direct implementation by dev team

---

## Section 1: Issue Summary

**Problem statement:** Epic 1 (Project Foundation & Player Authentication) was closed with stories 1.1–1.4 all `done` and retrospective completed. During the retrospective review, three foundational auth/UX features were identified as missing from the original scope:

1. **Logout** — Session management in story 1.2 handles login and verification but provides no mechanism to end a session.
2. **Admin account list + delete** — Story 1.4 implements account creation only; viewing and removing accounts was implicitly expected but never specified.
3. **Guest access** — Players without an account (or without an army) need read-only access to follow the campaign. The unauthenticated state was never designed.

**Discovery context:** Identified at Epic 1 retrospective (2026-03-13) before Epic 2 development began.

**Evidence:**
- `players` schema: `isAdmin` boolean present, no guest concept
- `auth.ts` spec: no `logout` server function
- Story 1.2 ACs: zero criteria on session termination
- Epics 2–5: all assume players have an army — unauthenticated/armyless state unhandled

---

## Section 2: Impact Analysis

**Epic impact:**
- Epic 1: Remains `in-progress`, receives 3 new stories (1.5, 1.6, 1.7)
- Epic 2: Story 2.1 (army import + assignment) must account for the Guest → Player transition when a guest logs in and gets an army assigned
- Epic 3: FAB and match invitations must be absent from DOM for guest sessions
- Epics 4, 5: No direct impact

**Artifact conflicts:**
- Epic 1 file: Incomplete — missing stories 1.5, 1.6, 1.7
- `sprint-status.yaml`: Missing entries for stories 1.5, 1.6, 1.7
- `implementation-patterns-consistency-rules.md`: No route protection pattern defined for guest vs authenticated vs unauthenticated states
- `sessions` schema: No guest session concept
- `players` schema: No `isGuest` flag

**Technical impact:**
- Minor schema migration: `players.is_guest boolean NOT NULL DEFAULT false` + ghost player seed
- Auth middleware: route guard logic extended to distinguish guest vs player vs no-session
- UI: conditional rendering for identity indicator, session action, write elements, admin link

---

## Section 3: Recommended Approach

**Selected path:** Option 1 — Direct Adjustment (add stories 1.5, 1.6, 1.7 to Epic 1)

**Rationale:**
- All three features are additive — no existing code needs to be reverted or reworked
- The ghost player model (`players.is_guest`) keeps `sessions.player_id` NOT NULL, preserving FK integrity and eliminating null propagation throughout the codebase
- Story order (1.5 Logout → 1.6 Admin list+delete → 1.7 Guest) is independent and logically sequenced
- No impact on Epic 2–5 timeline

**Effort:** Low-Medium (3 well-scoped stories)
**Risk:** Low (additive changes, one minor migration)

---

## Section 4: Detailed Change Proposals

### 4.1 Epic 1 File — Story 1.5 (NEW)

**File:** `_bmad-output/planning-artifacts/epics/epic-1-project-foundation-player-authentication.md`

```
## Story 1.5: Player Logout

As a player,
I want to log out of the app,
So that I can end my session and return to the login page.

**Acceptance Criteria:**

**Given** I am authenticated,
**When** I tap the "Se déconnecter" action (in the profile/header area),
**Then** my session cookie is cleared, the `sessions` table row is deleted,
and I am redirected to /login

**Given** I am on /login after logout,
**When** I navigate back (browser back button),
**Then** I am redirected back to /login (session is gone, protected routes reject)

**Given** I am a guest (isGuest session),
**When** I tap "Se connecter" (same location as "Se déconnecter"),
**Then** my guest session is cleared and I am redirected to /login

*No new tables. Extends: `sessions` table (story 1.2).*
```

---

### 4.2 Epic 1 File — Story 1.6 (NEW)

```
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
**Then** I see the account creation form (from story 1.4) AND a list of all
players (username, displayName, isAdmin flag, created_at)
— the ghost player (isGuest = true) is excluded from this list

**Given** I am viewing the player list,
**When** I tap "Delete" on a player account,
**Then** a confirmation is required before deletion proceeds

**Given** I confirm deletion of a player account,
**When** the deletion is processed,
**Then** the player row is removed from `players`, all associated `sessions`
rows are deleted, and the player list refreshes

**Given** I attempt to delete my own admin account,
**Then** the action is rejected server-side with an error message
(cannot self-delete)

*No new tables. Extends admin section from story 1.4.
Navigation entry point: profile/session menu, below "Se déconnecter",
admin-only — absent from DOM for all other roles.*
```

---

### 4.3 Epic 1 File — Story 1.7 (NEW)

```
## Story 1.7: Guest Access (Read-Only)

As an unauthenticated visitor,
I want to browse the campaign in read-only mode,
So that I can follow the campaign without needing an account.

**Acceptance Criteria:**

**Given** I am on /login with no active session,
**When** the page renders,
**Then** a text link "Continuer en tant qu'invité" (blue, below the login form)
is visible

**Given** I click "Continuer en tant qu'invité",
**When** the action is processed,
**Then** a session is created in `sessions` pointing to the ghost player
(players.isGuest = true), a session cookie is set,
and I am redirected to the Campaign view (/)

**Given** I have an active guest session,
**When** I navigate the app,
**Then** all three tabs (Campagne, Armées, Références) are accessible
and the Campaign view displays an empty match history

**Given** I have an active guest session,
**When** any write action is attempted (match creation, army edit,
profile update, admin),
**Then** the action is blocked — write UI elements (FAB, edit buttons, forms)
are absent from the DOM; server functions reject with 401

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

**Given** I am on a write route (/match/new, /admin, etc.)
with a guest or no session,
**When** the route loads,
**Then** I am redirected to /login

*Schema change: `players.is_guest boolean NOT NULL DEFAULT false` added.
Ghost player seeded at DB init (username: '__guest__', displayName: 'Invité',
isGuest: true, isAdmin: false). sessions.player_id remains NOT NULL with FK intact.
Guest sessions point to the ghost player ID.
Never use session === null as proxy for guest — always check player.isGuest.*
```

---

### 4.4 Architecture Patterns — Route Protection (UPDATE)

**File:** `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`

**ADD to Authentication Patterns section:**

```
## Route Protection Patterns

**Three session states (check via player.isGuest / player.isAdmin):**
- player.isGuest === true → Guest (read-only, no write access)
- player.isAdmin === true → Admin (full access + admin section)
- otherwise → Authenticated player

**Route guard rules:**
- Read-only routes (/, /armies, /armies/$armyId, /references):
  Allow guest sessions. Redirect to /login only if no session at all.
- Write routes (/match/new, /match/$matchId/post-match):
  Require non-guest session. Redirect to /login if guest or no session.
- Admin routes (/admin):
  Require player.isAdmin === true. Reject otherwise.

**UI rendering rules:**
- Write UI elements (FAB, edit buttons, forms): absent from DOM
  when player.isGuest === true
- "Administration" link: absent from DOM unless player.isAdmin === true
- Identity indicator (top-left): "Invité" | "Admin" | player.displayName
- Session action (profile menu): "Se déconnecter" (player/admin)
  or "Se connecter" (guest)

**Schema rule:**
players.is_guest boolean NOT NULL DEFAULT false
Ghost player seeded at init — never appears in admin player list,
never deletable. sessions.player_id always NOT NULL.
```

---

### 4.5 Sprint Status — Stories 1.5/1.6/1.7 (UPDATE)

**File:** `_bmad-output/implementation-artifacts/sprint-status.yaml`

```yaml
# OLD
  epic-1: in-progress
  1-1-project-scaffolding-deployment-pipeline: done
  1-2-player-login-session-management: done
  1-3-first-login-welcome-modal-display-name: done
  1-4-admin-player-account-creation: done
  epic-1-retrospective: done

# NEW
  epic-1: in-progress
  1-1-project-scaffolding-deployment-pipeline: done
  1-2-player-login-session-management: done
  1-3-first-login-welcome-modal-display-name: done
  1-4-admin-player-account-creation: done
  1-5-player-logout: backlog
  1-6-admin-player-account-list-delete: backlog
  1-7-guest-access-read-only: backlog
  epic-1-retrospective: done
```

---

## Section 5: Implementation Handoff

**Scope classification:** Minor — direct implementation by dev team

**Handoff to:** Dev agent (story-by-story via `bmad-bmm-dev-story`)

**Execution order:**
1. Story 1.5 — Logout (simple, no schema change)
2. Story 1.6 — Admin list + delete (extends existing admin section)
3. Story 1.7 — Guest access (schema migration + auth middleware changes)

**Dependencies:**
- Story 1.7 depends on 1.5 being done (logout mechanism reused for guest session clear)
- Stories 1.5 and 1.6 are independent

**Success criteria:**
- Player can log out and session is fully cleared
- Admin can view and delete accounts (ghost player excluded, self-delete rejected)
- Guest can browse all tabs in read-only mode with identity indicator visible
- All write UI absent from DOM for guest sessions
- `sessions.player_id` remains NOT NULL — FK integrity preserved
- E2E tests cover all three new auth states
