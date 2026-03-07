# Requirements Inventory

## Functional Requirements

FR1: A player can log in with a username and password
FR2: A player can update their display name
FR3: On first login, a player sees a dismissible welcome modal explaining the app, inviting them to update their name, and providing the admin contact
FR4: The admin can create a player account
FR5: The admin can assign an army to a player account
FR6: A player can only modify their own army's data
FR7: The result of a match can be edited by both participating players
FR8: The admin can import an army from an Old World Builder text export
FR9: The admin can manually enter units for an army (fallback if OWB parsing fails)
FR10: The admin can correct unit data after import
FR11: A player can view a unit card from their army (current XP, tier reached, campaign deltas)
FR12: A player can view unit cards from any army
FR13: A player can directly edit bonuses, penalties, and injuries on a unit of their own army without going through the post-match flow
FR14: A player can directly edit bonuses, penalties, and injuries on a character of their own army without going through the post-match flow
FR15: A player can view the scrollable timeline of their army (most recent match at top, then previous matches in reverse chronological order)
FR16: A player can view the timeline of an opponent's army
FR17: A player can create a match by selecting an opponent from campaign players
FR18: A player can see pending matches involving their army (matches created by an opponent where their evolutions are not yet entered)
FR19: Both players of a match can enter or modify the result (Victory / Defeat / Draw)
FR20: Evolutions linked to a match are visible on both participating players' timelines
FR21: A player can launch a sequential post-match flow for a played match
FR22: In the post-match flow, a player can enter XP gained for each unit in their army
FR23: In the post-match flow, a player can enter XP gained for each character in their army
FR24: The app automatically detects when a unit crosses an XP tier during entry
FR25: The app automatically detects when a character crosses an XP tier during entry
FR26: A player can choose an available improvement from the options of the tier reached for a unit
FR27: A player can choose an available improvement from the options of the tier reached for a character
FR28: In the post-match flow, a player can enter a permanent injury or bonus for a character taken out of action
FR29: A player can enter evolutions for a match retroactively
FR30: Any logged-in player can consult unit XP gain tables
FR31: Any logged-in player can consult character XP gain tables
FR32: Any logged-in player can consult the permanent character injuries table (2D6)
FR33: Any logged-in player can consult the unit destruction table (2D6)
FR34: Any logged-in player can consult the list of available improvements per tier (units and characters)

## NonFunctional Requirements

NFR1: Initial timeline load < 2 seconds on 4G mobile network
NFR2: SPA navigation between screens < 500ms
NFR3: Post-match flow interactions < 300ms
NFR4: Passwords stored hashed (bcrypt) — never in plain text
NFR5: All communications encrypted via HTTPS
NFR6: Routes and mutations protected server-side — a player cannot modify data from an army they do not own, even via request manipulation
NFR7: Mobile tap zones ≥ 44x44px
NFR8: Text/background contrast sufficient for reading in gaming conditions (variable lighting) — WCAG AA target
NFR9: OWB parser isolated as independent module — replaceable without impacting the rest of the application
NFR10: OWB parser processes a complete export in less than 5 seconds
NFR11: App available during gaming sessions (best-effort — no formal SLA)

## Additional Requirements

**Architecture — Starter Template (impacts Epic 1 Story 1):**
- Project initialized with: `npx @tanstack/cli create campaign_tow --add-ons drizzle,shadcn,tanstack-query --package-manager pnpm`
- Vitest added manually as dev dependency (not included in starter)
- TanStack Form + Zod adapter added manually

**Architecture — Database Schema:**
- Drizzle tables to create: `players`, `sessions`, `armies`, `units`, `sub_profiles`, `matches`, `match_participants`, `stat_modifiers`, `unit_gains`
- Base stats stored as typed text columns (9 per sub-profile: m, cc, ct, f, e, pv, i, a, cd) to accommodate dice expressions and modifiers
- Campaign stat changes stored in `stat_modifiers` (per-stat numeric deltas, source tracking)
- Campaign non-stat changes stored in `unit_gains` (abilities, text-based, active/inactive)
- OWB import data in `sub_profiles` never mutated — all changes in `stat_modifiers` + `unit_gains`

**Architecture — Auth:**
- Server-side HTTP-only signed cookie sessions + `sessions` table in PostgreSQL
- Admin flag (`isAdmin` boolean) for import/account management
- `armyOwnerMiddleware`: `army.playerId === session.playerId` verified server-side on every write
- Session secret via Railway env var `SESSION_SECRET`

**Architecture — Infrastructure & CI/CD:**
- Railway hosting: Node.js (Nitro) runtime + PostgreSQL plugin
- GitHub Actions CI: lint → typecheck → vitest → playwright on PRs
- Railway auto-deploy on merge to main
- Environment vars: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD_HASH` — no .env files in repo
- Dev seed script: `pnpm tsx src/db/seed.ts` via real OWB parser

**Architecture — Domain Logic:**
- `lib/constants.ts`: all static campaign data (XP thresholds, 2D6 tables, improvement lists)
- `lib/xp-calculator.ts`: `calculateTier()`, `getAvailableImprovements()` — pure functions
- `lib/delta-composer.ts`: `composeUnitView(baseStats, statModifiers, unitGains)` — pure function
- `lib/owb-parser.ts`: standalone module, no imports from rest of app

**UX — Responsive Design:**
- Mobile-first, single breakpoint at 640px
- Desktop: `max-width: 680px; margin: 0 auto`, dark shell background on `<body>` (≥ 640px)
- Fonts: Cinzel + Inter as woff2 self-hosted in `public/fonts/`
- No image/illustration optimization for MVP (V2 feature)

**UX — Accessibility:**
- WCAG AA target
- Semantic HTML required: `<nav>`, `<main>`, `<section>`
- ARIA: `CreateMatchFab` → `aria-label="Créer une partie"`, `UnitCard` → `role="article"` + `aria-label`, `TabBar` → `<nav aria-label="Navigation principale">` + `aria-current="page"` on active tab
- Focus indicators: never suppress `outline`

## FR Coverage Map

| FR | Epic |
|---|---|
| FR1 | Epic 1 — Player login with username/password |
| FR2 | Epic 1 — Player updates display name |
| FR3 | Epic 1 — First-login welcome modal |
| FR4 | Epic 1 — Admin creates player account |
| FR5 | Epic 2 — Admin assigns army to player (moved: requires armies to exist) |
| FR6 | Epic 1 — Player can only modify own army data |
| FR7 | Epic 3 — Match result editable by both players (moved: requires match logic) |
| FR8 | Epic 2 — Admin imports army from OWB export |
| FR9 | Epic 2 — Admin manually enters units (fallback) |
| FR10 | Epic 2 — Admin corrects unit data after import |
| FR11 | Epic 2 — Player views own unit card (XP, tier, deltas) |
| FR12 | Epic 2 — Player views any army's unit cards |
| FR13 | Epic 2 — Player directly edits unit bonus/penalty/injury |
| FR14 | Epic 2 — Player directly edits character bonus/penalty/injury |
| FR15 | Epic 3 — Player views own army scrollable timeline |
| FR16 | Epic 3 — Player views opponent army timeline |
| FR17 | Epic 3 — Player creates a match with selected opponent |
| FR18 | Epic 3 — Player sees pending matches (action chips) |
| FR19 | Epic 3 — Both players can enter/edit match result |
| FR20 | Epic 3 — Match evolutions visible on both timelines |
| FR21 | Epic 4 — Player launches sequential post-match flow |
| FR22 | Epic 4 — Player enters XP per unit |
| FR23 | Epic 4 — Player enters XP per character |
| FR24 | Epic 4 — App detects unit XP tier crossing |
| FR25 | Epic 4 — App detects character XP tier crossing |
| FR26 | Epic 4 — Player chooses improvement for unit tier-up |
| FR27 | Epic 4 — Player chooses improvement for character tier-up |
| FR28 | Epic 4 — Player enters permanent injury or bonus for character |
| FR29 | Epic 4 — Player enters evolutions retroactively |
| FR30 | Epic 5 — Unit XP gain tables |
| FR31 | Epic 5 — Character XP gain tables |
| FR32 | Epic 5 — Permanent character injuries table (2D6) |
| FR33 | Epic 5 — Unit destruction table (2D6) |
| FR34 | Epic 5 — Available improvements list per tier |
