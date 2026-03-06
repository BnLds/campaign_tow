# Project Context Analysis

## Requirements Overview

**Functional Requirements:**
34 FRs across 7 domains:
- **Auth & Accounts (FR1–7):** Username/password login, display name, welcome modal, admin account/army management, per-army write authorization, shared match result editing
- **Army Import & Setup (FR8–10):** OWB text import (admin), manual fallback entry, post-import correction
- **Unit Cards (FR11–14):** Read own/cross-army unit stats with campaign deltas; direct edit of bonuses/injuries/malus without post-match flow
- **Timeline & Matches (FR15–20):** Scrollable timeline (current state + chronological history), cross-army consultation, match creation, pending match visibility, shared result entry, cross-player delta visibility
- **Post-Match Flow (FR21–29):** Sequential per-unit XP entry, automatic tier detection, improvement choice at tier-up, character injury/bonus entry, retroactive entry
- **References (FR30–34):** Static lookup tables for XP rules, injuries (2D6), unit destruction (2D6), available improvements by tier
- **Admin (FR3–5, FR8–10):** Account creation, army assignment, OWB import

**Non-Functional Requirements:**
- Performance: Initial timeline load < 2s on 4G; SPA navigation < 500ms; post-match interactions < 300ms
- Security: Hashed passwords (bcrypt); HTTPS; server-side authorization per army (cannot be bypassed by request manipulation)
- Accessibility: Tap targets ≥ 44x44px; sufficient contrast for variable lighting conditions
- Integration: OWB parser isolated as independent module, replaceable without impacting the rest of the app; parsing completes in < 5s
- Reliability: Best-effort availability during play sessions — no formal SLA

**Scale & Complexity:**
- **Primary domain:** Full-stack web (SPA + API + relational DB)
- **Complexity level:** Low — ~15 players, ~10 armies, small dataset over campaign lifetime
- **Estimated architectural components:** ~9 domain entities (Player, Session, Army, Unit, SubProfile, Match, MatchParticipant, StatModifier, UnitGain), ~6 server routes/actions, ~8 custom UI components

## Technical Constraints & Dependencies

- **Stack decided in PRD:** TanStack Start + shadcn/ui + PostgreSQL
- **OWB Parser:** Text format from old-world-builder.com — informally structured (sections, sub-profiles, special rules, equipment). Must be isolated as a standalone module with manual-entry fallback.
- **No PWA/offline for MVP:** Standard web app, no Service Worker requirement in Phase 1
- **No real-time sync:** No WebSocket or SSE needed — simple request/response architecture
- **Admin-only army import for MVP:** Self-service import deferred to Phase 2
- **Sub-profile data model:** Units can have 1–N sub-profiles each with 9 stats (M/CC/CT/F/E/PV/I/A/Cd). Stats can be static numbers, dice expressions (3D6), modifiers ((+1)), or empty (–). Storage must accommodate this.

## Cross-Cutting Concerns Identified

1. **Authorization enforcement:** Every write mutation must verify server-side that the requesting player owns the target army. This applies to unit edits, post-match flow, and match result updates.
2. **XP tier calculation consistency:** Tier thresholds and improvement options differ between units and characters. This logic must live in a single domain layer, not duplicated in UI and API.
3. **Campaign change storage:** Base stats (from OWB import) must remain immutable. Numeric stat changes stored in `stat_modifiers`, non-numeric changes (abilities, champion, banner) in `unit_gains`. Both composed at read time by `delta-composer.ts`.
4. **Shared match ownership:** A match record is shared between two players — both can set the result, but each enters their own army's evolutions independently.
5. **Tolerance for incomplete data:** Units and matches can exist in partially-filled states. No required-field enforcement at match creation or mid-flow.
