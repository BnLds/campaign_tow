# Project Context Analysis

## Requirements Overview

**Functional Requirements:**
41 FRs across 9 domains:
- Faction Data & Detection (FR1-3): canonical faction list, auto-detection from army data, OWB import update
- Tile Management (FR4-8): CRUD tiles with terrain type, base income, river adjacency, accordion display
- Colony Management (FR9-15): village/city construction, faction-specific constraints, alternative structures (Chaos Portals, Ogre Tyrant Hall), upgrade paths, CO deduction, building slot tracking
- Building Construction (FR16-21): faction+terrain-filtered building availability, slot limits, military building constraints, automatic free buildings (farm on agricultural plain, mine for Dwarf mountains, menagerie on swamp)
- CO Economy — Income (FR22-25): manual weekly trigger, idempotent per week, aggregation of all revenue sources, balance credit
- CO Economy — Manual Entries (FR26-28): label + amount expense/income, immediate balance update
- CO Economy — Balance & History (FR29-31): persistent balance display, estimated weekly income, chronological transaction history
- Territory Dashboard & Export (FR32-33): overview + markdown export for Discord
- Initial Setup (FR34-37): multi-step bootstrap (CO balance → tiles → colonies/buildings → confirm)
- Chaos God Consecration (FR38-40): god assignment on village founding, god-diversity enforcement, unit/character slots per god
- Error Correction (FR41): LIFO transaction cancellation with state rollback

**Non-Functional Requirements:**
13 NFRs across 4 categories:
- Performance (NFR1-5): dashboard <2s on 4G, income calc <2s, construction <500ms, accordion <100ms, history <1s for 200 entries
- Security (NFR6-8): ownership-scoped mutations (same model as armies), server-authoritative CO balance, UNDO race condition prevention
- Reliability (NFR9-11): idempotent weekly income, append-only transaction log, interruptible setup flow
- Integration (NFR12-13): OWB faction detection, faction data as structured config (not hardcoded logic)

**Scale & Complexity:**
- Primary domain: full-stack web (brownfield SPA extension)
- Complexity level: medium-high (faction rule engine is the dominant factor)
- Estimated architectural components: ~6 new DB tables, ~15 server functions, ~8 custom components, 1 route, ~3 validators, 1 faction config module

## Technical Constraints & Dependencies

**From existing codebase (code audit — source of truth):**
- Database: PostgreSQL + Drizzle ORM, single schema file `src/db/schema.ts`, snake_case columns, UUID text PKs
- Server functions: `createServerFn` + middleware chain (`authMiddleware` → `armyOwnerMiddleware`) + `ServerResult<T>` return type
- Auth: session cookie → `getSession()` → `SessionData { playerId, isAdmin, username, isGuest }`
- Ownership: `armyOwnerMiddleware` validates player→army ownership — territory ownership will chain through this (player → army → faction → territory rules)
- Route: `/territories` placeholder exists, TabBar already wired
- UI: shadcn/ui + Tailwind v4 + `cw-*` tokens, `max-width: 720px` container
- Forms: TanStack Form + Zod (Standard Schema, no adapter)
- State: TanStack Query with defined stale times in `query-constants.ts`
- Existing wizard pattern: `post-match-wizard/` (8 files, reducer + phases) — reusable for setup wizard

**From PRD constraints:**
- All 18 factions must be supported at MVP — partial support breaks adoption
- Faction rules are data-driven (config, not per-faction code)
- CO balance is server-authoritative — no client-side computation
- Transaction log is append-only — cancellations create reversal entries

## Cross-Cutting Concerns Identified

1. **Faction rule engine** — affects tile management, colony management, building construction, income calculation, and setup wizard. Every mutation must consult faction config. This is the single most pervasive cross-cutting concern.

2. **CO ledger integrity** — every CO-mutating operation (construction, income, manual entry, UNDO) must atomically update balance + create transaction entry. Transaction isolation required.

3. **Authorization model** — territory data is player-scoped. Must extend existing `armyOwnerMiddleware` pattern or create equivalent `territoryOwnerMiddleware`. Admin bypass required.

4. **Idempotency** — weekly income generation must be idempotent per week per player. Requires week tracking (which week was last generated).

5. **State rollback (UNDO)** — FR41 requires LIFO cancellation. Construction UNDO must reverse CO + remove building/colony. Income UNDO must reverse CO credit. This constrains transaction design — each transaction must store enough metadata to reverse its effect.
