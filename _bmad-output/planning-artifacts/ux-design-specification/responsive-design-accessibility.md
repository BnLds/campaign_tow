# Responsive Design & Accessibility

## Responsive Strategy

**Mobile (primary use case):**
The app is designed to be held in hand or placed on the table during a game. All design decisions originate from mobile — no adaptation required, it is the native target.

**Desktop (secondary use case):**
Used by players at home for post-match entry and by admin (Ben) for initial setup. Strategy: centred single-column layout, `max-width: 680px`, auto margins. A dark shell background frames the app and prevents the "floating column in a void" effect.

- App container: `max-width: 680px; margin: 0 auto`
- Shell background (≥ 640px): `linear-gradient(180deg, #15110d, #0f0d0b)` + `radial-gradient(circle at top, rgba(212,168,67,.08), transparent 30%)` applied to `<body>`
- No desktop-specific features or interactions — the app functions on desktop, it is not optimised for it

**Tablet:**
Same treatment as mobile — identical layout, slightly more surrounding space. No navigation or component changes.

## Breakpoint Strategy

Mobile-first. One functional breakpoint:

| Range | Treatment |
|---|---|
| `< 640px` | Native mobile layout — primary target |
| `≥ 640px` | Centred `max-width: 680px`, shell background activated |

No tablet/desktop-specific breakpoint — content scales naturally within the centred container.

## Component Adaptation Checklist (desktop)

All components must be verified at 680px width before desktop is considered done:

| Component | Adaptation required |
|---|---|
| `TabBar` | `max-width: 680px; margin: 0 auto` — must follow container, not viewport edges |
| `CreateMatchFab` | `right` positioned relative to container, not viewport — stays within the 680px frame |
| `app-header` | `sticky top: 0` — must cover full container width, not beyond |
| `ActionChip` strip | `overflow-x: auto` works at all widths — chips may fit on one line at 680px, acceptable |
| `UnitCard` stats row | flex `flex: 1` per cell — widens naturally, no intervention needed |
| `TimelineEntry` / cards | margin `0 4px` mobile → `0 8px` desktop for slightly more breathing room |
| `Dialog` / `Sheet` | Radix UI centres in viewport by default — verify visual alignment within 680px frame |
| Stepper (XP entry) | Centred in its container — follows container width naturally |

## Accessibility Strategy

**Target level: WCAG AA**

Radix UI (shadcn/ui base) provides component-level accessibility out-of-the-box (ARIA, focus management, keyboard navigation). Campaign TOW-specific requirements:

| Criterion | Status |
|---|---|
| Primary text contrast (`#171310` on `#f1eade`) | > 7:1 — exceeds AA ✓ |
| Secondary text contrast (`#6b5f52` on `#f1eade`) | ~ 4.7:1 — passes AA ✓ |
| Colour not used alone | Bonus/malus always prefixed `+`/`–` ✓ |
| Touch targets ≥ 44px | Defined in UX patterns ✓ |
| Form labels | Above field, never placeholder-as-label ✓ |
| Focus indicators | Radix UI manages natively — do not suppress `outline` |
| Semantic HTML | `<nav>`, `<main>`, `<section>` required |
| ARIA on custom components | See implementation guidelines below |

**Out of scope for MVP:**
- Full screen reader testing (VoiceOver / NVDA) — not a target use case for 15 players
- OS high-contrast mode
- Full keyboard-only navigation — exclusively touch-based usage

## Testing Strategy

**Responsive:**
- Test on iPhone SE (375px, narrow) and iPhone 14 (390px, standard) — Chrome mobile + Safari iOS
- Test on desktop Chrome for admin use case (post-match entry)
- Real device preferred over emulator

**Accessibility:**
- Contrast validation: WebAIM Contrast Checker for all text/background pairs
- Lighthouse accessibility audit (Chrome DevTools) — target score > 90
- No screen reader testing MVP

## Implementation Guidelines

**Responsive:**
- Use relative units (`rem`, `%`) for font-size and spacing — no fixed `px` on text
- `max-width: 680px; margin: 0 auto` on root app container
- Shell background activated via `@media (min-width: 640px)` on `<body>` — CSS only
- No image/asset responsive optimisation needed for MVP (no illustrations until V2)

**Accessibility:**
- Never suppress `outline` on focusable elements — style if needed but preserve
- `CreateMatchFab`: `aria-label="Créer une partie"` — "+" alone is insufficient
- `ActionChip`: `role="button"` — visible text is the accessible label, no redundant `aria-label`
- `UnitCard`: `role="article"`, `aria-label` = unit name
- `TabBar`: `<nav aria-label="Navigation principale">`, active tab with `aria-current="page"`
- `Dialog` and `Sheet`: Radix UI manages focus trap and `aria-modal` natively — do not override
- General rule: use `aria-label` only when visible text is absent or insufficient
