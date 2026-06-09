---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
workflowStatus: complete
completedDate: '2026-04-10'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - 'docs/territory_rule.md'
  - 'docs/faction_rule.md'
workflowType: 'prd'
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: brownfield
---

# UX Design Specification — Territory Module (campaign_tow)

**Author:** Ben
**Date:** 2026-04-10

---

## Executive Summary

### Project Vision

The territory module is the **strategic layer** of Campaign TOW. The tactical layer already exists (matches, XP, unit cards, narrative timeline). This module adds: tile management, colony development, building construction, and the CO (Crown) economy — replacing the manual Discord/paper calculations that players currently rely on.

The core promise: a player opens the app, sees their empire at a glance, triggers weekly income in one tap, and the app surfaces only faction-relevant options — no rule cross-referencing needed.

### Target Users

~15 players in an ongoing Warhammer: The Old World campaign. They already use Campaign TOW on mobile (at the game table, on the go). They know the campaign rules but don't want to cross-reference them manually. Intermediate tech profile — not developers, but comfortable with mobile apps. Primary device: phone. Secondary: desktop browser.

### Key Design Challenges

1. **Faction rule complexity** — ~15 factions with unique colonization rules, faction buildings, and special structures (Chaos Portals, Ogre Tyrant Hall, Dwarf mine upgrades, etc.). The UX must hide this complexity by showing only what's relevant to the player's faction while remaining rules-accurate.

2. **Mid-campaign onboarding** — Players already own tiles, colonies, and buildings. The setup flow must bootstrap existing state without being tedious (same pattern as the existing initial XP bootstrap).

3. **Information density on mobile** — Tiles × colonies × buildings × revenues × CO history — significant data to display on a phone screen without overwhelming the player. The accordion pattern (already proven for unit cards) is the right foundation, but information hierarchy must be carefully designed.

4. **CO balance as persistent anchor** — The CO balance is the single most important data point. It must be visible at all times within the territory tab and update in real-time with every action (construction, income generation, manual entry).

### Design Opportunities

1. **Built-in faction awareness** — Unlike Discord, the app knows the player's faction. Colonization options and building availability can be automatically filtered. This is the "magic moment": the player never sees an invalid option.

2. **Consistency with the tactical layer** — Same UX patterns (cards, accordion, wizards, FAB). The player feels on familiar ground. The territory module blends seamlessly into the existing app.

3. **Transaction history as audit trail** — Every CO spent or earned is traceable. This builds trust ("the app is right, not my paper notes") and replaces the Discord message archaeology players currently do.

## Core User Experience

### Defining Experience

The defining experience of the territory module is **empire management in context**: the player sees their economic and territorial state, acts on it (build, trigger income, add a tile), and the app shows only what's relevant to their faction. No single action dominates — consulting, building, and generating income are equally important.

### Platform Strategy

- **Mobile-first responsive** (identical to existing app) — primary usage on phone
- Touch-only: tap zones ≥ 44px, no hover-only interactions
- No offline requirement — reliable network connection assumed
- Centered max 720px container (existing convention)
- "Territoires" tab (📖) already wired in TabBar

### Effortless Interactions

- **Automatic faction filtering** — when building a colony or constructing a building, the app shows only valid options for the player's faction and tile type. Zero rule cross-referencing.
- **CO balance always visible** — fixed in the territory tab header, updated instantly on every action.
- **Weekly income in one tap** — one button, one result. No configuration, no parameters.
- **Automatic free buildings** — village on agricultural plain → free farm added automatically. Dwarf village in mountains → free mine. The player doesn't need to remember these rules.

### Critical Success Moments

1. **The faction-aware moment** — the player opens "Build" and sees only what's available to them. The moment of "the app knows my rules better than I do."
2. **The first income generated** — one tap, revenue breakdown displayed line by line (tile X → 30 CO, farm → 20 CO...), balance goes up. Satisfying, simple, no complex animation — just a clear summary.
3. **Initial setup completed** — the player has bootstrapped their mid-campaign state and sees their dashboard populated. Transition from "everything is on paper" to "everything is in the app."

### Experience Principles

1. **Faction-first** — every screen filters by the player's faction. The app never shows an invalid option.
2. **CO as throughline** — the CO balance is the permanent anchor. Every action that modifies it is immediately reflected and traceable.
3. **Familiarity** — same patterns as the tactical layer (accordions, cards, wizards, shadcn components). Zero additional learning curve.
4. **Clarity over spectacle** — no complex animations or excessive gamification. Information is clear, actions are direct, results are explicit.

## Desired Emotional Response

### Primary Emotional Goals

- **Mastery** — "I have control over my empire." The player sees everything, understands everything, acts with confidence. No need to ask for help on Discord.
- **Reliability** — "The app is right." The player trusts the income calculation, the CO balance, the building options. They stop verifying manually.

### Emotional Journey Mapping

| Stage | Desired Feeling |
|---|---|
| First visit (setup flow) | Guided competence — "this is straightforward, I can do this" |
| Dashboard consultation | Quiet confidence — "I know exactly where I stand" |
| Building/constructing | Empowered — "I see my options, I choose, it's done" |
| Weekly income generation | Calm satisfaction — clear summary, balance goes up |
| Checking transaction history | Trust — "every CO is accounted for" |
| Error or invalid action | Protected — the app prevented the mistake before it happened |

### Micro-Emotions

- **Confidence over confusion** — the player never wonders "is this the right amount?" → every CO deduction shows its source
- **Quiet satisfaction over excitement** — weekly income is satisfying (clear summary) but sober (no confetti)
- **Competence over anxiety** — faction filtering eliminates the fear of "making a rule mistake"

### Design Implications

- **Trust** → every CO mutation displays detail (before/after, source). Transaction history serves as audit trail.
- **Satisfaction** → weekly income summary is clear and readable, not spectacular. Line-by-line breakdown.
- **Competence** → invalid options are never shown, not greyed out — absent. The player only sees what they can do.
- **Protection** → destructive actions (remove tile, cancel transaction) require confirmation via AlertDialog.

### Emotional Design Principles

1. **Show the math** — never hide how a number was calculated. CO balance changes always show the breakdown.
2. **Prevent, don't punish** — faction rules are enforced by filtering options, not by error messages after the fact.
3. **Familiar warmth** — same visual language as the tactical layer (parchment palette, Cinzel headings, navy accents). The territory module feels like home.
4. **Quiet competence** — the app makes the player feel knowledgeable without being flashy about it.

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**1. Budget apps (YNAB, Bankin')** — balance + transaction pattern
- Prominent balance in header, always visible
- Chronological transaction list with categories
- Each line shows amount + source + date
- *Relevance:* CO balance header and transaction history structure

**2. Campaign TOW tactical layer** — primary reference
- Accordion for unit cards → accordion for tiles
- Timeline entry cards → transaction history entries
- PostMatchWizard multi-step → territory setup flow
- ActionChip for pending items → chips for available tile actions
- *Relevance:* all patterns. The player must not learn a new app.

**3. Clash of Clans / base management apps** — "build in a slot" pattern
- Visible slots (1 slot village, 3 slots city) with "+" button to build
- Automatic filtering of what's available
- Cost displayed next to each option
- *Relevance:* clear "X free slots, here's what you can build" pattern

**4. Notion / Todoist** — hierarchical accordion pattern
- Collapsible sections with summary in header
- Expand for detail, collapse for overview
- *Relevance:* accordion with visual indicators in collapsed header (tile type, revenue, building count)

### Transferable UX Patterns

**Navigation:** Tile accordion as primary dashboard content — same accordion pattern as unit cards in army view.

**Interaction:** Slot-based construction — "X free slots" with inline cost and faction-filtered options. One tap to build, confirmation dialog for CO deduction.

**Information hierarchy:**
1. CO balance + estimated weekly income (header — always visible)
2. Tile list (accordion — primary content)
3. Actions (build, trigger income — contextual, within tile or header)
4. Transaction history (secondary — accessible via a discrete "CO History" button, not a dominant dashboard element)

### Anti-Patterns to Avoid

- **Greying out unavailable options** — hide completely instead. Less cognitive noise, aligned with "prevent, don't punish" principle.
- **Stacked modals** — one action = one dialog max. No modal inside a modal.
- **Client-side CO calculations** — CO is server-authoritative. No optimistic updates on balance.
- **Action overload on a single screen** — dashboard shows state, actions happen in context (tap tile → tile options).
- **Transaction list as primary view** — CO history is a verification tool, not the main content. Do not reproduce the "banking app" pattern where the statement dominates the screen.

### Design Inspiration Strategy

| Source | Adopt | Adapt | Avoid |
|---|---|---|---|
| Budget apps | Header balance display | Simplify (no categories, no graphs). Transaction history is secondary, not primary content. | Forecasting complexity, statement-dominant layout |
| Campaign TOW tactical | Accordion, cards, wizard, chips | Adapt accordion for tiles instead of units | — |
| Clash of Clans | Visible slots + inline cost | List version (no 2D map) | Timers, gamification |
| Notion/Todoist | Hierarchical accordion with summary | Informative collapsed header | Excessive nesting depth |

## Design System Foundation

### Design System Choice

**shadcn/ui + Tailwind v4 + custom `cw-*` tokens** — extending the existing design system, no changes to the foundation.

### Rationale for Selection

- Already in place and proven on the tactical layer — no reason to change
- shadcn provides all needed primitives (Accordion, Dialog, AlertDialog, Sheet, Button, Input, Select)
- Tailwind v4 with `cw-*` tokens bridged via `@theme inline` in `src/styles.css` — consistent styling
- shadcn components in `src/components/ui/`, custom domain components in `src/components/`
- Mandatory per project directives: shadcn when possible, Tailwind when possible

### Implementation Approach

**shadcn components to use:**

| Component | Territory Module Usage |
|---|---|
| `Accordion` | Tile list (primary dashboard content) |
| `Dialog` / `Sheet` | Building construction, tile addition, income generation details |
| `AlertDialog` | Confirmations (remove tile, cancel transaction) |
| `Button` | Actions (build, trigger income, add tile, manual CO entry) |
| `Select` | Terrain type selection, building selection |
| `Input` | Manual CO entries (label, amount) |

**Custom components to create:**

| Component | Role |
|---|---|
| `TileAccordionItem` | Accordion item with informative header (terrain type, revenue, colony status, building count) |
| `CoBalanceHeader` | Fixed header with CO balance + estimated weekly income |
| `BuildingSlot` | Building slot display (occupied with building info, or available with "+" action) |
| `TransactionEntry` | CO history line (type icon, amount, date, source label) |

### Customization Strategy

Zero customization to the existing design system. The territory module uses the existing palette and typography as-is. Any new territory-specific tokens (if needed) follow the `cw-*` naming convention and are added to `src/styles/globals.css` + bridged in `src/styles.css` `@theme inline` block.

## Defining Core Experience

### Defining Experience

"I manage my empire and the app knows my faction's rules."

The player sees their tiles, builds colonies and buildings, and only sees options valid for their faction. The app replaces Discord tables, printed rules, and weekly mental arithmetic with a single source of truth.

### User Mental Model

Players currently manage territories via:
- A shared Discord table or text file
- Printed rules or PDF for faction-specific constraints
- Manual calculation (paper/mental) each week for income
- Discord messages to signal constructions and balance changes

Their mental model is: "I have tiles, each tile can have stuff on it, and all of this earns me CO." The app must match this model exactly — no additional abstraction layers.

### Success Criteria

| Criterion | Indicator |
|---|---|
| "It works" | Player triggers weekly income in < 3 taps, correct balance |
| "I understand" | Every number has an accessible explanation (revenue = visible sum) |
| "I can't go wrong" | Player never sees a building/colony option forbidden for their faction |
| "It's fast" | Adding a tile + building a village < 30 seconds |
| "I can find everything" | CO history accessible, every transaction sourced |

### Pattern Analysis — 100% Established

No novel interactions. Everything uses proven patterns from the existing app:
- Accordion (unit cards → tile cards)
- Dialog/Sheet (post-match wizard → construction flow)
- Contextual button actions (action chips → construction buttons)
- Header with key info (army header → CO balance header)

The differentiator is **automatic faction filtering** — not a new UX pattern (it's data filtering), but the core value: the app knows your faction and shows only valid options.

### Experience Mechanics

**1. Initiation:** Player taps "Territoires" tab (📖). Lands on dashboard — CO balance header at top, tile accordion list below.

**2. Interaction (example: build a building):**
- Tap a tile in the accordion → tile expands
- Player sees colony (village/city), existing buildings, free slots
- Tap "Build" → Dialog/Sheet opens with available buildings (faction + tile type filtered)
- Player selects a building, sees CO cost
- Tap "Confirm" → CO deducted, building added, accordion updated

**3. Feedback:** CO balance in header updates immediately. Building appears in the slot. No complex animation — just updated state.

**4. Completion:** Tile accordion stays open with the new building visible. Player can continue (another building, another tile) or browse.

## Visual Design Foundation

### Color System

Existing palette — no changes. All tokens defined in `src/styles/globals.css` and bridged as `cw-*` in `src/styles.css` `@theme inline` block.

| Token | Hex | Territory Module Usage |
|---|---|---|
| `--color-bg` | #f1eade | Page background |
| `--color-surface` | #fffbf5 | Card / accordion item backgrounds |
| `--color-header-bg` | #f7f1e8 | CO balance header background |
| `--color-border` | #e0d5c8 | Accordion borders |
| `--color-brand` | #334155 | Action buttons (build, trigger income) |
| `--color-brand-dark` | #1e293b | Confirmation buttons |
| `--color-bonus` / `--color-bonus-bg` | #2d7a3a / #edf8ef | CO income (positive) |
| `--color-malus` / `--color-malus-bg` | #b82c2c / #fdf0f0 | CO expenses (negative) |
| `--color-gold` | #d4a843 | Current player highlight (if multi-player lists) |
| `--color-text-primary` | #171310 | Primary text |
| `--color-text-secondary` | #6b5f52 | Secondary labels, descriptions |
| `--color-section-label` | #938677 | Section headers (uppercase) |

No new tokens needed for MVP. The existing bonus/malus semantics already cover income/expense.

### Typography System

Identical to existing app:
- **Cinzel 600-700** — tile names, section titles, headers
- **Inter 400-500-700** — body text, stats, labels, CO amounts, navigation

### Spacing & Layout Foundation

- Container: `max-width: 720px`, centered, `padding: 1rem`
- Cards / accordion items: `border-radius: 16px`, `surface` background
- Gap between items: `0.75rem` (12px) — existing convention
- Tap zones: ≥ 44px minimum
- CO balance header: sticky or fixed at top of territory content area
- Accordion: shadcn `Accordion` with customized trigger header

### Accessibility Considerations

- Secondary text contrast (#6b5f52 on #fffbf5): ~4.7:1 — WCAG AA compliant
- Primary text contrast (#171310 on #f1eade): >7:1 — WCAG AAA compliant
- Bonus green (#2d7a3a) and malus red (#b82c2c): never used alone to convey information — always accompanied by a sign (+/−) or text label
- Focus rings: existing convention (`.nav-btn-brand:focus-visible`)
- Touch targets: all interactive elements ≥ 44px

## Design Direction Decision

### Design Directions Explored

Two layout proposals were generated and compared:

**Proposal A — Classic Accordion:**
- Single-column accordion (same pattern as unit cards in army view)
- Sticky CO header with balance + income + generate button
- Tiles expand vertically, one at a time
- Transaction history as separate view

**Proposal B — 2-Column Grid (CHOSEN):**
- 2-column grid showing all tiles at a glance
- Dark navy CO banner (`brand-dark`) as visual anchor
- Slot dots on collapsed tiles for at-a-glance building capacity
- Terrain color strips encoding tile type visually
- Toggle in CO banner to switch between tiles view and transaction history
- Tiles expand in-place to full width

### Chosen Direction

**Proposal B — 2-Column Grid** selected.

Reference mockup: `_bmad-output/planning-artifacts/ux-mockup-territory-B.html`

### Design Rationale

- **Grid over accordion** — tiles are the primary content; showing all tiles at a glance is more valuable than a single-column list that requires scrolling. The tactical layer uses accordion because unit cards have dense stat data. Territory tiles have lighter data — grid works better.
- **Navy CO banner** — creates a strong visual anchor that separates the CO economy (the strategic throughline) from the tile content below. High contrast with parchment background draws the eye to the balance.
- **Slot dots** — at-a-glance indicator of building capacity without expanding the tile. Filled dots = occupied, empty dots = available. Immediate comprehension.
- **Terrain color strips** — visual encoding of tile type before reading the label. Faster scanning.
- **Toggle for transaction history** — keeps history accessible (one tap in the CO banner) without adding navigation complexity or a separate route. Aligns with "secondary but accessible" requirement.

### Implementation Approach

- Tile grid: CSS Grid `grid-template-columns: 1fr 1fr` with gap, responsive (can collapse to single column on very narrow screens if needed)
- Expanded tile: spans full width (`grid-column: 1 / -1`), pushes other tiles down
- CO banner: sticky positioned below AppHeader, uses `brand-dark` background with white text
- Construction flow: bottom Sheet (shadcn Sheet) with building list
- Transaction history: toggled inline via state in CO banner, replaces tile grid when active

## User Journey Flows

### J1 — Weekly Territory Management

**Actor:** Thomas (Bretonniens) | **Entry:** Tab Territoires → Dashboard (grid + CO banner)

**Flow:**

```
Dashboard
  ├─ Add tile → Dialog "Terrain type" → Select terrain → Confirm → Tile added to grid
  ├─ Tap tile → Expand in-place (full width)
  │   ├─ Build village → AlertDialog (cost 150 CO, balance after) → Confirm → Village created, slots visible
  │   ├─ Build building → Sheet "Build" (faction-filtered list) → Tap building → AlertDialog cost → Confirm
  │   └─ Upgrade to city → AlertDialog (cost 500 CO) → Confirm → 3 slots, characters unlocked
  ├─ Generate income → Tap button in CO banner → Line-by-line summary → Balance updated
  └─ History → Toggle in CO banner → Transaction list → Toggle back to grid
```

**Key decisions:**
- Every CO-deducting action goes through AlertDialog confirmation (amount + balance after)
- Income summary is a temporary expansion showing each source line by line
- "Generate" button disabled if already done this week (label: "Revenu généré ✓")

### J2 — Mid-Campaign Initial Setup

**Actor:** Thomas (first visit) | **Entry:** Tab Territoires → Empty state

**Flow:**

```
Empty state "Configurer mes territoires" → Tap CTA → Multi-step wizard:
  Step 1: Current CO balance → Number input
  Step 2: Add existing tiles → Loop (Select terrain + name → Add) → "Next"
  Step 3: For each tile with colony → Mark village/city → Add existing buildings
  Step 4: Full summary (tiles, colonies, buildings, balance) → "Confirm"
→ Dashboard populated
```

**Key decisions:**
- Same pattern as existing PostMatchWizard (numbered steps, back/forward navigation)
- Step 2 is a loop — player adds as many tiles as needed before moving to step 3
- Step 4 (summary) is critical — player must see and validate EVERYTHING before confirming
- Can be interrupted and resumed (NFR11)

### J3 — Manual CO Entry

**Actor:** Thomas | **Entry:** Dashboard → "+" button or action in CO banner

**Flow:**

```
Dashboard → Tap "+" → Sheet "Manual entry"
  → Toggle Expense / Income
  → Input label (e.g., "Chevaliers du Royaume x5")
  → Input amount (e.g., 120)
  → Tap "Confirm" → Balance updated, entry visible in history
```

**Key decisions:**
- Ultra-short flow: 3 fields + confirm
- Expense/Income toggle determines sign (+/−)
- No complex validation — just non-empty label + amount > 0

### J4 — Faction Constraints (Chaos Daemons)

**Actor:** Marc (Démons du Chaos) | **Entry:** Tab Territoires → Dashboard

**Flow:**

```
Dashboard → Add tile → Select terrain → Confirm
  → Chaos Portal created automatically (no "Build village" option)
  → Tile displays: Portal, +40 CO, +50 pts, 1 slot
→ Tap tile expand → Visible options:
  ├─ Build building → Sheet filtered (military + wizard tower + menagerie ONLY)
  └─ Upgrade to Major Portal (300 CO) → AlertDialog → Confirm → 3 slots, +80 CO, +100 pts
```

**Key decisions:**
- Daemon player NEVER sees "Build village" option — it's absent, not greyed out
- Portal is created automatically on tile addition — no extra action
- Building filter shows only military, wizard tower, menagerie per faction rules

### Journey Patterns

| Pattern | Usage |
|---|---|
| **AlertDialog CO confirmation** | Every action that deducts CO: construction, upgrade, manual entry |
| **Sheet selection** | Choosing from a filtered list: buildings, terrain type |
| **Expand in-place** | Tap tile in grid → expand full width with details |
| **Toggle in banner** | Switch between grid view and history view |
| **Multi-step wizard** | Initial setup (same pattern as PostMatchWizard) |
| **Empty state + CTA** | First visit with no territories configured |

### Flow Optimization Principles

1. **Minimum taps** — add tile = 3 taps (type, name, confirm). Build building = 3 taps (expand, build, confirm).
2. **Immediate feedback** — every CO mutation updates the banner instantly.
3. **No dead ends** — after every action, the player stays in context (expanded tile, grid) and can chain actions.
4. **Errors impossible** — invalid options are absent, insufficient balance disables the confirm button.

## Component Strategy

### Design System Components

shadcn components already installed and used by the territory module:

| Component | Territory Usage |
|---|---|
| `Accordion` | Base for tile grid expand/collapse behavior |
| `Sheet` | Building construction, manual CO entry, terrain selection |
| `AlertDialog` | CO confirmation dialogs (build, upgrade, delete) |
| `Dialog` | Setup wizard steps |
| `Button` | Actions (build, generate income, add tile) |
| `Select` | Terrain type, building choice |
| `Input` | Manual entry label, CO amount, tile name |
| `Switch` | River plain adjacency toggle |
| `Label` | Form labels |

### Custom Components

**1. `CoBanner`**
- **Purpose:** Sticky banner with CO balance + estimated income + actions
- **Content:** CO balance (large number), "+125 CO/semaine" (secondary), "Générer le revenu" button, "Hist." toggle link
- **States:** normal | income-already-generated (button disabled + "✓") | history-active (toggle ON, grid replaced by transaction list)
- **Style:** Background `brand-dark` (#1e293b), white text, sticky below AppHeader
- **Accessibility:** `aria-live="polite"` on balance (dynamically updated)

**2. `TileCard`**
- **Purpose:** Tile card in the 2-column grid
- **Content (collapsed):** Terrain color strip at top, tile name (Cinzel), terrain type, revenue badge, colony indicator (village/city/portal/—), slot dots (filled/empty)
- **Content (expanded):** Terrain info (type, base revenue), colony section (status + upgrade button), building list (occupied + free slots with "+"), river adjacency toggle (if river plain)
- **States:** collapsed | expanded (full width `grid-column: 1/-1`) | empty-tile (no colony, build CTA)
- **Variants:** standard | faction-specific (chaos portal, tyrant hall)

**3. `BuildingSlot`**
- **Purpose:** Display a building slot (occupied or available)
- **Content (occupied):** Building name, revenue/effect, version (base/upgraded)
- **Content (available):** "+" button with "Construire" label
- **States:** occupied | available | no-slots (all occupied, no button)

**4. `BuildingOption`**
- **Purpose:** Row in the construction Sheet
- **Content:** Building name (Cinzel), short description, CO cost badge, "Faction" label if faction building
- **States:** affordable (cost ≤ balance) | too-expensive (cost > balance, muted text, not tappable)

**5. `TransactionEntry`**
- **Purpose:** Row in CO transaction history
- **Content:** Type icon (income/construction/manual), label, amount (+/− colored bonus/malus), date
- **Variants:** income (green) | expense (red) | neutral (info)

**6. `IncomeBreakdown`**
- **Purpose:** Weekly income summary after triggering generation
- **Content:** List of sources (tile → amount, building → amount), total, week number
- **Display:** Temporary expansion below CoBanner or Sheet

**7. `TerritorySetupWizard`**
- **Purpose:** Multi-step wizard for initial territory bootstrap
- **Steps:** CO balance → Add tiles → Colonies/buildings → Summary/confirmation
- **Pattern:** Identical to PostMatchWizard (step state, back/forward navigation)

### Component Implementation Strategy

- All custom components built with shadcn primitives + Tailwind `cw-*` tokens
- No inline CSS — Tailwind classes only
- TanStack Form + Zod for any form inputs (setup wizard, manual CO entry)
- TanStack Query for server state (tile list, CO balance, transaction history)
- Server functions for mutations (build, generate income, add tile) returning `ServerResult<T>`

### Implementation Roadmap

**Phase 1 — Dashboard core:** `CoBanner`, `TileCard`, `BuildingSlot` → player can see their territories

**Phase 2 — Actions:** `BuildingOption`, `IncomeBreakdown` → player can build and generate income

**Phase 3 — Onboarding + history:** `TerritorySetupWizard`, `TransactionEntry` → initial setup and audit trail

## UX Consistency Patterns

### Button Hierarchy

| Level | Component | Territory Usage | Style |
|---|---|---|---|
| **Primary** | `Button variant="brand"` | "Générer le revenu", "Confirmer" (construction) | `brand` navy background, white text |
| **Secondary** | `Button variant="outline"` | "Annuler", "Retour" | `separator` border, transparent background |
| **Destructive** | `Button variant="destructive"` | "Supprimer la tuile", "Annuler la transaction" | `malus` red background |
| **Ghost** | `Button variant="ghost"` | "Hist." toggle, "Voir les règles" | No background, `text-secondary` text |
| **Slot CTA** | Custom `Button` | "+" in BuildingSlot | Dashed `border`, "+" icon |

**Rule:** One primary button visible per context. If a Sheet has "Confirmer" (primary), "Annuler" is secondary.

### Feedback Patterns

| Situation | Pattern | Example |
|---|---|---|
| **Successful CO mutation** | Instant CoBanner update (`aria-live`) | Balance 340 → 190 after village construction |
| **Income generated** | IncomeBreakdown (temporary expansion or Sheet) | Source list + total + week number |
| **Server error** | Red toast (3s) at bottom | "Erreur lors de la construction" |
| **Insufficient balance** | Confirm button disabled + muted text | "Solde insuffisant (besoin : 150 CO)" |
| **Blocked action** | Navy toast (3s) — existing `blockToast` pattern | "Revenu déjà généré cette semaine" |
| **Setup completed** | Transition to populated dashboard | Wizard disappears, grid appears |

### Form Patterns

- **Validation:** Zod server-side (source of truth) + TanStack Form client-side (immediate feedback)
- **Inputs:** shadcn `Input` + `Label`, always with explicit placeholder
- **Selects:** shadcn `Select` for short lists (terrain type = 8 options)
- **Toggles:** shadcn `Switch` for booleans (river plain adjacency)
- **CO amounts:** `Input type="number"` with min=1, no decimals
- **Wizard:** Numbered steps, "Suivant" / "Retour" buttons, current step highlighted

### Navigation Patterns

- **Entry:** "Territoires" tab (📖) in existing TabBar → route `/territories`
- **No sub-routes:** entire module lives in a single route. Expand/collapse, Sheets, and Dialogs handle internal navigation.
- **Back:** no back button within the module — the grid is always the primary context. Closing a Sheet/Dialog returns to grid.
- **History toggle:** in CoBanner, switches between tile grid and transaction list. No page navigation.

### Modal & Overlay Patterns

| Overlay | Component | Usage | Dismissal |
|---|---|---|---|
| **CO confirmation** | `AlertDialog` | Any CO expense | "Confirmer" / "Annuler" buttons only |
| **Selection / form** | `Sheet` (bottom) | Building construction, manual entry, add tile | Swipe down, tap backdrop, close button |
| **Setup wizard** | `Dialog` (centered) | Initial bootstrap | No accidental dismissal — buttons only |

**Rule:** AlertDialog for irreversible actions (CO deducted). Sheet for selections/forms (easily cancellable).

### Empty States & Loading

| State | Display |
|---|---|
| **No territories (first visit)** | Sober illustration + "Configurer mes territoires" CTA (primary button) |
| **Tile without colony** | Muted text "Pas de colonie" + "Construire un village" button if faction allows |
| **All slots occupied** | No "+" button — just building list |
| **Loading** | "Chargement…" centered text (existing app pattern) |
| **Empty history** | "Aucune transaction" centered, muted text |

## Responsive Design & Accessibility

### Responsive Strategy

**Mobile-first** — identical to existing app. Module designed for 375px as primary target.

**Mobile (< 768px) — primary design:**
- Tile grid: 2 columns (`1fr 1fr`)
- CoBanner: full width, sticky
- Sheets: bottom sheet full width
- Expanded tile: full width (`grid-column: 1/-1`)

**Desktop (≥ 768px):**
- Container always `max-width: 720px` centered (existing convention — no use of extra space)
- Tile grid: stays 2 columns (tiles are wider, not more numerous)
- Sheets: same bottom sheet, max-width constrained

No tablet-specific breakpoint — the 720px container works from 375px to desktop.

### Breakpoint Strategy

No custom breakpoints. The territory module uses the same `max-width: 720px` container as the rest of the app. The 2-column grid works at all sizes thanks to the constrained container.

Only edge case: **very narrow screens (< 340px)** — grid could collapse to 1 column. Given the user profile (recent smartphones), this is marginal.

### Accessibility Strategy

**WCAG AA compliance** — consistent with existing app.

- **Contrast:** Already validated in step 8 (primary text >7:1, secondary ~4.7:1)
- **Touch targets:** ≥ 44px on all interactive elements
- **Color + text:** Bonus/malus never encoded by color alone — always accompanied by a sign (+/−)
- **Focus:** Existing focus rings (`.nav-btn-brand:focus-visible`), keyboard navigation on all buttons
- **ARIA:** `aria-live="polite"` on CO balance (dynamic updates), `aria-expanded` on tile grid items
- **Screen reader:** Slot dots have hidden text labels ("2 bâtiments sur 3 emplacements")

### Testing Strategy

- **Responsive:** Test on Chrome mobile (DevTools 375px) + Safari iOS — the two primary use cases
- **Accessibility:** No formal screen reader testing for this project (~15 known players, no identified need). ARIA and contrast best practices applied by default.
- **Browser matrix:** Chrome/Chromium, Safari iOS, Firefox desktop, Samsung Internet best-effort (unchanged)

### Implementation Guidelines

- Tailwind responsive utilities (`sm:`, `md:`) if needed — but the 720px container eliminates most cases
- No `px` for text sizes — use Tailwind classes (`text-sm`, `text-base`, etc.)
- Test CoBanner sticky with existing AppHeader sticky — ensure they don't stack unexpectedly
- E2E hydration pattern mandatory on `territories.tsx` (same as all routes)
