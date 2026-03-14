# AC Trace Report — Story 2-4: Direct Edit of Unit & Character Deltas
Generated: 2026-03-14

## Summary
- Total ACs: 9
- ACs with test coverage: 9
- ACs without test coverage: 0
- Total tests: 434 passing (90 tests across 3 story-specific test files)

---

## AC Trace Matrix

| AC | Description (brief) | Covering Tests | Status |
|---|---|---|---|
| AC1 | Add stat modifier → `stat_modifiers` + unit card update | QRY-001, QRY-002, QRY-003, QRY-004, QRY-005, SFN-001, SFN-002, SFN-003, SFN-004, SFN-005, SFN-006, SFN-007, SFN-008, SFN-009, SFN-030, SFN-031, SFN-032, SFN-033, SFN-034, LDR-001, LDR-002 | ✅ COVERED |
| AC2 | Add permanent injury (char) → `stat_modifiers` + red delta | QRY-001, QRY-002, QRY-003, QRY-004, QRY-005, SFN-001, SFN-002, SFN-003, SFN-004, SFN-005, SFN-006, SFN-007, SFN-008, SFN-009 | ✅ COVERED |
| AC3 | Add unit gain → `unit_gains` + delta chips | QRY-011, QRY-012, QRY-013, QRY-014, SFN-014, SFN-015, SFN-016, SFN-017, SFN-018, SFN-030, SFN-033, SFN-034 | ✅ COVERED |
| AC4 | Edit unit XP → `units.xp` update + tier recalculation | QRY-020, QRY-021, QRY-022, QRY-023, QRY-024, SFN-023, SFN-024, SFN-025, SFN-026, SFN-027, SFN-028, SFN-029 | ✅ COVERED |
| AC5 | Edit character XP → XP updated + tier recalculated | QRY-020, QRY-021, QRY-022, QRY-023, QRY-024, SFN-023, SFN-024, SFN-025, SFN-026, SFN-027, SFN-028, SFN-029 | ✅ COVERED |
| AC6 | Army ownership enforcement via `armyOwnerMiddleware` | SFN-002, SFN-011, SFN-015, SFN-020, SFN-024, SFN-031, SFN-035, MW-001, MW-002, MW-003, LDR-001, LDR-002, CMP-006, CMP-007, CMP-008, CMP-009, CMP-016, CMP-017 | ✅ COVERED |
| AC7 | Delete existing stat modifier → row removed + card updates | QRY-006, QRY-007, QRY-008, QRY-009, QRY-010, SFN-010, SFN-011, SFN-012, SFN-013 | ✅ COVERED |
| AC8 | Delete existing unit gain → row removed + chip disappears | QRY-015, QRY-016, QRY-017, QRY-018, QRY-019, SFN-019, SFN-020, SFN-021, SFN-022 | ✅ COVERED |
| AC9 | Unit-army consistency: `unitId` must belong to `armyId` | QRY-025, QRY-026, QRY-027, QRY-028, QRY-029, SFN-006, SFN-007, SFN-017, SFN-026, CON-001, CON-002, CON-003, CON-004 | ✅ COVERED |

---

## Coverage Gaps

None — all 9 ACs have test coverage.

**Note on test methodology:** All 90 story-specific tests are *structural contract tests* (file-content assertions). They verify that required code patterns, function exports, validation logic, and middleware wiring exist in the source files. They do not test runtime/behavioral correctness (no DB calls, no HTTP requests). Behavioral integration tests require a live test DB and are deferred per the test-file headers.

---

## Implementation Files

| File | ACs implemented |
|---|---|
| `src/db/queries.ts` | AC1, AC2, AC3, AC4, AC5, AC7, AC8, AC9 — query functions: `insertStatModifier`, `deleteStatModifier`, `insertUnitGain`, `deleteUnitGain`, `updateUnitXp`, `getUnitById`, `getStatModifierById`, `getUnitGainById` |
| `src/routes/armies/$armyId.tsx` | AC1–AC9 — server functions: `addStatModifierFn`, `removeStatModifierFn`, `addUnitGainFn`, `removeUnitGainFn`, `updateXpFn`, `fetchUnitDeltasFn`; extended loader with `isOwner`; `UnitEditPanel` integration |
| `src/components/UnitEditPanel.tsx` | AC1, AC2, AC3, AC4, AC5, AC7, AC8 — edit panel with stat modifier / unit gain / XP forms; empty states; form reset; loading states; French UI |
| `src/lib/middleware.ts` | AC6 — `armyOwnerMiddleware` (pre-existing, verified by MW tests) |

---

## Test Files

| File | Tests | Scope |
|---|---|---|
| `tests/2-4-unit-deltas-queries.test.ts` | 29 | DB query function contracts in `src/db/queries.ts` |
| `tests/2-4-unit-deltas-server.test.ts` | 44 | Server function contracts in `src/routes/armies/$armyId.tsx` + `src/lib/middleware.ts` |
| `tests/2-4-unit-edit-panel-component.test.ts` | 17 | `UnitEditPanel` component + visibility logic in army route |
