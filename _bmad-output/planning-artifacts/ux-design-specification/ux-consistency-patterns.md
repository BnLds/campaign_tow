# UX Consistency Patterns

## Button Hierarchy

| Level | Usage | Style |
|---|---|---|
| **Primary** | Main action per screen (Confirm, Save) | Navy `#334155` bg, white text, `border-radius: 10px` |
| **Success** | Confirm victory, validate positive post-match | Green `#2d7a3a` bg, white text |
| **Danger** | Delete match, confirm loss outcome | Red `#b82c2c` bg, white text |
| **Secondary** | Cancel, contextual back | `#fff8ef` bg, `#6a5b4b` text, `#dfd1bf` border |
| **FAB** | Match creation — unique entry point | Circular navy, `position: absolute`, always visible |

**Rules:**
- Maximum 1 primary button visible per screen
- FAB does not replace inline buttons — it is the sole "Create" entry point
- Minimum tap target: `min-height: 44px` on all frequent actions

## Feedback Patterns

**Match result badges:**
- Victory: bg `#edf8ef`, text `#2d7a3a`, border `#bfe0c6` — label "Victoire"
- Defeat: bg `#fdf0f0`, text `#b82c2c`, border `#efc2c2` — label "Défaite"
- Draw: bg `#f8f2e3`, text `#8a6a10`, border `#ead9a8` — label "Égalité"

**Unit delta chips:**
- Bonus: bg `#edf8ef`, green text, border `#bfe0c6` — e.g. `+1 CC`
- Malus: bg `#fdf0f0`, red text, border `#efc2c2` — e.g. `–1 Endurance`
- Always prefixed `+` or `–` — never colour alone (colour-blind accessibility)

**XP tier reached:**
- MVP: `Sheet` (shadcn/ui) from bottom — Cinzel gold title "Palier atteint !", sober content, upgrade choice
- No toast, no discrete notification — this is a strong flow moment, not a side effect

**Toast / snackbar:**
- Used only for destructive action confirmations (match deletion)
- Style: bg `#1e293b`, white text, 3s duration, no stacking

## Form Patterns

**XP entry (post-match, per unit):**
- Stepper: `–` button left · numeric value centre · `+` button right
- Centre field tappable for direct keyboard input (`inputMode="numeric"`)
- `–` button disabled (greyed) when value = 0 — no lower bound enforcement needed beyond that
- No upper bound — no inline validation needed
- No stepper cap — direct input handles large values naturally

**Match creation:**
- `Select` (shadcn/ui) for opponent — required, "Créer" button disabled until selected
- Date: native `<input type="date">` — pre-filled to today, always valid
- Single "Créer" action — no confirmation step
- No field validation messages needed: only one required field (opponent), handled by button disable state

**General rules:**
- No required field that blocks navigation outside of post-match flow
- Errors: displayed below the relevant field, never in a modal
- Labels above fields, never placeholder-as-label

## Navigation Patterns

**TabBar (3 fixed tabs):**
- Active tab: bg `#dfe8f4`, 3px navy top indicator, text `#334155`
- Inactive tab: text `#9a8d7f`, no background
- Always visible — no hide-on-scroll
- **Post-match flow interruption**: if user taps a tab during post-match flow, a `Dialog` appears:
  - "Continuer le post-match" (primary, navy)
  - "Abandonner" (secondary)
  - Abandon = full cancellation, post-match chip remains in Campagne view
  - No partial save — avoids corrupt state

**Back button:**
- Ghost button `‹` — border `#d9cfbf`, bg `#fff9f2` — top-left of header
- Present only in army detail view (only view with a clear parent)
- No app-managed swipe-back — native iOS/Android behaviour preserved

**Action chips (pending items):**
- Horizontal `ScrollArea`, `scroll-snap-type: x proximity`
- No pagination, no scroll indicator — last chip edge visible signals more
- Section hidden entirely when no pending items — no empty chip strip

**Section labels:**
- Inter 10px, uppercase, letterspacing `.12em`, colour `#938677`
- Token: `.section-label` — used consistently across all views (Historique, Personnages, Unités de base…)

## Modal & Overlay Patterns

| Pattern | When | Component | Dismissal |
|---|---|---|---|
| `Sheet` (bottom) | XP tier upgrade choice | shadcn/ui `Sheet` — blocks background | Explicit action only |
| `Dialog` (centre) | Post-match flow abandon confirmation | shadcn/ui `Dialog` — backdrop | Explicit action only |
| `Dialog` (centre) | Match deletion confirmation | shadcn/ui `Dialog` — backdrop | Explicit action only |
| Future info overlay | Informational only (rules lookup…) | shadcn/ui `Sheet` | Tap-outside allowed |

**Critical vs informational rule:**
- Critical overlays (irreversible or flow-interrupting actions): no tap-outside dismissal
- Informational overlays (read-only content): tap-outside allowed

## Empty States & Loading

**Loading (skeleton):**
- Timeline on load: `Skeleton` (shadcn/ui) on 3 cards
- Army view: skeleton on UnitCards
- Shown only if load time > 300ms — not shown for instant responses

**Empty states:**
- Army with no matches: Inter 12px, `#6b5f52`, text "Aucune partie jouée" — no illustration (MVP)
- Action chip strip empty: section not rendered — no empty strip shown
- Player without army: impossible — admin creates armies before player first login

---
