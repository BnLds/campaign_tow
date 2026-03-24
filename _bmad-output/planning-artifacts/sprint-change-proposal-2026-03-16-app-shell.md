# Sprint Change Proposal — App Shell UI/UX Gap

**Date:** 2026-03-16
**Triggered by:** Story 3.1 completion — navigation and layout components missing from epic decomposition
**Scope classification:** Minor — direct adjustment within Epic 3
**Approved:** Yes

---

## 1. Issue Summary

The UX design specification defines core navigation and layout components (TabBar, ArmyListItem, app shell layout) as "Phase 1 — Core (MVP blockers)" in the component strategy. These components were never decomposed into stories during epic planning. The app currently operates with an ad-hoc navigation pattern (basic header + links) instead of the validated 3-tab architecture.

This gap was discovered after completing story 3.1, and blocks story 3.2 (which requires the FAB positioned above the TabBar) and Epic 5 (References view accessible via the third tab).

## 2. Impact Analysis

| Artifact | Impact |
|---|---|
| Epic 3 | New story 3.1b added between 3.1 and 3.2 |
| Epic 1-2 | None (completed) |
| Epic 4-5 | None (benefit from shell being in place) |
| PRD | No changes needed |
| Architecture | No changes needed |
| UX Spec | No changes needed (already defines these components) |
| sprint-status.yaml | Updated — new story entry added |

## 3. Recommended Approach

**Selected path:** Direct Adjustment — add story 3.1b to Epic 3, positioned after 3.1 and before 3.2.

**Rationale:**
- The TabBar and layout are prerequisites for 3.2 (FAB positioning) and Epic 5 (References tab)
- No rollback needed — this is missing work, not incorrect work
- No MVP scope change — these components were always part of MVP scope per UX spec
- Minimal disruption to sprint plan — single story insertion with no renumbering

**Effort:** Medium | **Risk:** Low

## 4. Detailed Changes

### New Story Added

**Story 3.1b: App Shell — TabBar, Layout & Navigation Components** added to `epic-3-campaign-timeline-match-management.md`.

Key deliverables:
- TabBar component (3 fixed tabs: Campagne / Armées / Références)
- App shell layout in `__root.tsx`: AppHeader preserved at top (display name, logout button, admin link) + scrollable content area + TabBar fixed at bottom
- ArmyListItem component with gold "current" variant and win/draw/loss record
- Campaign view header enriched with win/draw/loss record
- `/territories` placeholder route
- FAB positioning compatibility (bottom: 62px above TabBar)

### Sprint Status Updated

Entry `3-1b-app-shell-tabbar-layout-navigation: backlog` added to `sprint-status.yaml`.

## 5. Implementation Handoff

- **Scope:** Minor — direct implementation by dev team
- **Next step:** Create story file via `create-story` workflow, then implement
- **Success criteria:** All 3 tabs navigate correctly, ArmyListItem renders with design tokens, campaign header shows win/loss record, existing AppHeader elements (name, logout, admin link) preserved
