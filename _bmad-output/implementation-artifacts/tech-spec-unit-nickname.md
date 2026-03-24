---
title: 'Unit Nickname (Surnom)'
slug: 'unit-nickname'
created: '2026-03-24'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [drizzle-orm, postgresql, tanstack-start, react, vitest]
files_to_modify:
  - src/db/schema.ts
  - src/lib/owb-parser.ts
  - src/lib/validators.ts
  - src/db/queries/armies.ts
  - src/db/queries/units.ts
  - src/lib/server-fns/add-units-to-army.ts
  - src/components/unit-card.tsx
  - src/components/unit-edit-panel.tsx
  - src/routes/armies/$armyId.tsx
  - tests/owb-parser.test.ts
code_patterns:
  - 'Server functions: createServerFn + armyOwnerMiddleware + zod inputValidator'
  - 'DB queries: standalone async functions in src/db/queries/'
  - 'Parser: pure function, no DB access, returns ParsedArmy'
  - 'Components: inline styles, design tokens via CSS vars'
  - 'ServerResult<T> return type for all server functions'
test_patterns:
  - 'Vitest with describe/it/expect'
  - 'Parser tests read real army files from docs/'
  - 'Component tests in src/components/__tests__/'
  - 'Server/integration tests in tests/'
---

# Tech-Spec: Unit Nickname (Surnom)

**Created:** 2026-03-24

## Overview

### Problem Statement

Units currently have no nickname field — they can only be identified by their OWB type name. Players who name their units in OWB exports (e.g., "Xlaco-Tok, Vétéran Scarifié Saurus") lose that personalization on import. Players who don't name units at import have no way to add nicknames later.

### Solution

Add a nullable `nickname` text column to the `units` table. Extract nicknames automatically from OWB imports (split on first comma). Display nickname as primary label when present, with unit type as secondary. Allow manual editing via a blur-save text field in the existing UnitEditPanel.

### Scope

**In Scope:**
- `nickname` column (text, nullable) on `units` table + Drizzle migration
- OWB parser: extract nickname from "Nickname, UnitType" format (split on first comma)
- Display: nickname as primary label, type name as secondary
- Edit: blur-save text input in UnitEditPanel for all units and characters
- Server function to update nickname

**Out of Scope:**
- Nicknames on sub-profiles
- Allowed character validation (no restrictions beyond max length)
- Rename history/audit trail

## Context for Development

### Codebase Patterns

- **Server functions** follow the pattern: `createServerFn({ method: 'POST' }).middleware([armyOwnerMiddleware]).inputValidator(z.object({...})).handler(...)`. They are defined in `src/routes/armies/$armyId.tsx` (co-located with the route). They return `{ success: true, data } | { success: false, error: { code, message } }`.
- **DB queries** are standalone `async` functions exported from `src/db/queries/units.ts`. They use Drizzle's `eq()`, `and()`, etc. Pattern for updates: `db.update(table).set({...}).where(eq(table.id, id)).returning()`.
- **OWB parser** (`src/lib/owb-parser.ts`) is a pure function. Three formats (markdown/plaintext/blocktext) normalize to markdown then parse. Unit line regex: `^- (\d+ )?(.+?) \[(\d+) pts\]`. Returns `ParsedArmy` with `ParsedUnit[]`.
- **Components** use inline styles with CSS custom properties (design tokens). No CSS modules.
- **Unit name display** in `UnitCard`: `{unit.name}` in `font-display` (Cinzel), 700 weight, at line 358.
- **Edit panel header**: `Modifier : {unitName}` at line 482.
- **Server fn props pattern**: server functions are passed as props to `UnitEditPanel` (typed as function types in the component).

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/db/schema.ts:46-61` | `units` table definition — add `nickname` column |
| `src/lib/owb-parser.ts:20-28` | `ParsedUnit` interface — add `nickname` field |
| `src/lib/owb-parser.ts:263-284` | Unit line parsing — split nickname from name |
| `src/lib/validators.ts` | `addUnitsToArmySchema` — add `nickname` to unit object schema |
| `src/db/queries/armies.ts:15-27` | `createArmyWithUnits` — insert `nickname` |
| `src/db/queries/units.ts:79-109` | `getUnitsForArmy` — uses bare `select()` (returns all columns) |
| `src/db/queries/units.ts:111-155` | `getArmyWithUnits` — uses bare `select()` on units |
| `src/db/queries/units.ts:251-258` | `updateUnitXp` — pattern to follow for `updateUnitNickname` |
| `src/db/queries/units.ts:283-297` | `getUnitById` — explicit `select({...})`, must add `nickname` |
| `src/db/queries/units.ts:299-310` | `getGraveyardUnits` — explicit `select({...})`, add `nickname` |
| `src/lib/server-fns/add-units-to-army.ts:20-32` | `addUnitsToArmyFn` — insert values, add `nickname` |
| `src/components/unit-card.tsx:14-19` | `UnitCardProps` — unit prop type |
| `src/components/unit-card.tsx:348-358` | Name display area |
| `src/components/unit-edit-panel.tsx:105-109` | `UnitEditPanelProps` |
| `src/components/unit-edit-panel.tsx:454-487` | Panel header and layout |
| `src/routes/armies/$armyId.tsx:253-274` | `updateXpFn` — pattern for `updateNicknameFn` |
| `src/routes/armies/$armyId.tsx:690-706` | Props passed to `UnitEditPanel` |
| `tests/owb-parser.test.ts` | Existing parser tests for blocktext format |
| `docs/army_2.txt` | Army without nicknames (plaintext format) |
| `docs/army_3_txt` | Army with nicknames (blocktext format) |

### Technical Decisions

- **Parser nickname extraction**: After the existing regex captures `name` (group 2), split on first comma: `const commaIdx = name.indexOf(',')`. If found: `nickname = name.slice(0, commaIdx).trim()`, `name = name.slice(commaIdx + 1).trim()`. If not found: `nickname = null`, `name` unchanged. **Invariant: OWB unit type names never contain commas** — verified across all known exports. The comma is only present when a user adds a custom nickname prefix in OWB.
- **Nullable field**: empty nickname stored as `NULL`. Clearing sets to `NULL`. Empty string input normalized to `NULL`.
- **Display priority**: `nickname ?? name` as primary label (Cinzel 700). When nickname exists, show `name` as secondary text (Inter, `0.8rem`, secondary color) below the nickname.
- **Blur-save interaction**: The nickname input saves automatically on blur (focus lost). No "Enregistrer" button needed. Only triggers server call if the value actually changed. Shows brief feedback message on success/error.
- **Server function location**: `updateNicknameFn` defined in `src/routes/armies/$armyId.tsx`, co-located with other unit mutation server functions.
- **Double ownership check**: `armyOwnerMiddleware` verifies the player owns the army. The handler additionally verifies the target unit belongs to *that specific army* (prevents cross-army mutation when a player owns multiple armies).
- **getUnitsForArmy / getArmyWithUnits**: Use bare `.select()` on `units` → Drizzle returns all columns automatically. Adding `nickname` to schema is sufficient — no query changes needed.
- **getUnitById / getGraveyardUnits**: Use explicit `select({...})` → must add `nickname: units.nickname`.
- **Migration**: Run `pnpm db:generate && pnpm db:push` after schema change. Column is nullable so no data migration needed.

## Implementation Plan

### Tasks

- [x] Task 1: Add `nickname` column to DB schema
  - File: `src/db/schema.ts`
  - Action: Add `nickname: text('nickname')` (nullable by default) to the `units` table definition, after the `name` column (line 51).
  - Notes: No default value needed — NULL is the default for nullable columns.

- [x] Task 2: Add `nickname` field to `ParsedUnit` interface
  - File: `src/lib/owb-parser.ts`
  - Action: Add `nickname: string | null` to the `ParsedUnit` interface (after `name` at line 22).

- [x] Task 3: Extract nickname in parser unit line handling
  - File: `src/lib/owb-parser.ts`
  - Action: In the unit line parsing block (lines 270-284), after `const name = unitMatch[2].trim()`:
    ```typescript
    const commaIdx = name.indexOf(',')
    let nickname: string | null = null
    let unitName = name
    if (commaIdx !== -1) {
      nickname = name.slice(0, commaIdx).trim().slice(0, 80)
      unitName = name.slice(commaIdx + 1).trim()
    }
    ```
    Then use `unitName` instead of `name` in the `currentUnit` object, and add `nickname`. Important: the local variable is renamed from `name` to `unitName` — update all references in the scope of `currentUnit` creation accordingly.
  - Notes: This handles all three formats (markdown, plaintext, blocktext) because they all normalize to the same markdown `- Name [pts]` format before parsing.

- [x] Task 4: Pass `nickname` in `createArmyWithUnits`
  - File: `src/db/queries/armies.ts`
  - Action: Add `nickname: unit.nickname` to the `.values({...})` object in the `tx.insert(units)` call (line 20).

- [x] Task 5: Pass `nickname` in `addUnitsToArmyFn` + update validator
  - Files: `src/lib/server-fns/add-units-to-army.ts`, `src/lib/validators.ts`
  - Action:
    1. In `src/lib/validators.ts`: add `nickname: z.string().max(80).nullable().optional()` to the unit object inside `addUnitsToArmySchema`.
    2. In `src/lib/server-fns/add-units-to-army.ts`: add `nickname: unit.nickname ?? null` to the `.values({...})` object in the `tx.insert(units)` call (line 23).

- [x] Task 6: Add `nickname` to explicit select queries
  - File: `src/db/queries/units.ts`
  - Action: Add `nickname: units.nickname` to the select objects in:
    - `getUnitById` (line 285-296)
    - `getGraveyardUnits` (line 300-306)
  - Notes: `getUnitsForArmy` and `getArmyWithUnits` use bare `select()` — no changes needed. Also check `src/db/queries/index.ts` barrel file and re-export `updateUnitNickname` if needed.

- [x] Task 7: Add `updateUnitNickname` query
  - File: `src/db/queries/units.ts`
  - Action: Add new function following the `updateUnitXp` pattern:
    ```typescript
    export async function updateUnitNickname(unitId: string, nickname: string | null): Promise<boolean> {
      const result = await db
        .update(units)
        .set({ nickname })
        .where(eq(units.id, unitId))
        .returning()
      return result.length > 0
    }
    ```
  - Notes: Export from `src/db/queries/index.ts` barrel file if one exists.

- [x] Task 8: Add `updateNicknameFn` server function
  - File: `src/routes/armies/$armyId.tsx`
  - Action: Add server function following the `updatePointsFn` pattern:
    ```typescript
    const updateNicknameFn = createServerFn({ method: 'POST' })
      .middleware([armyOwnerMiddleware])
      .inputValidator(
        z.object({
          armyId: z.string(),
          unitId: z.string(),
          nickname: z.string().trim().max(80).nullable(),
        }),
      )
      .handler(async ({ data }) => {
        const { getUnitById, updateUnitNickname } = await import('../../db/queries')
        const unit = await getUnitById(data.unitId)
        if (!unit || unit.armyId !== data.armyId) {
          return {
            success: false as const,
            error: { code: 'BAD_REQUEST', message: "Cette unité n'appartient pas à cette armée" },
          }
        }
        const nickname = data.nickname === '' ? null : data.nickname
        await updateUnitNickname(data.unitId, nickname)
        return { success: true as const }
      })
    ```

- [x] Task 9: Update `UnitCard` to display nickname
  - File: `src/components/unit-card.tsx`
  - Action:
    1. Update `UnitCardProps.unit` type to include `nickname: string | null`.
    2. Replace the name display block (lines 350-359) with:
       ```tsx
       const displayNickname = unit.nickname && unit.nickname !== unit.name ? unit.nickname : null

       <div
         style={{
           fontFamily: 'var(--font-display)',
           fontWeight: 700,
           fontSize: '1rem',
           color: 'var(--color-text-primary)',
         }}
       >
         {displayNickname ?? unit.name}
       </div>
       {displayNickname && (
         <div
           style={{
             fontFamily: 'var(--font-body)',
             fontWeight: 400,
             fontSize: '0.8rem',
             color: 'var(--color-text-secondary)',
           }}
         >
           {unit.name}
         </div>
       )}
       ```
  - Notes: Secondary text at `0.8rem` (not `0.75rem`) to maintain readability of the unit type name.

- [x] Task 10: Update `UnitEditPanel` with nickname blur-save field
  - File: `src/components/unit-edit-panel.tsx`
  - Action:
    1. Add to `UnitEditPanelProps`: `updateNicknameFn` type (same pattern as other server fn props). Reference the existing `useFeedback()` hook at line 150 and `FeedbackMsg` component at line 441 of `unit-edit-panel.tsx` — do NOT define a separate `FeedbackMsg` or manual feedback state.
    2. Add state:
       ```typescript
       const [nicknameInput, setNicknameInput] = useState(unit.nickname ?? '')
       const nicknameSaving = useRef(false)
       const nicknameFeedback = useFeedback()
       ```
    3. Add a useEffect to resync when props change (insert after the state declarations):
       ```typescript
       useEffect(() => {
         setNicknameInput(unit.nickname ?? '')
       }, [unit.nickname])
       ```
    4. Add a blur handler:
       ```typescript
       async function handleNicknameBlur() {
         if (nicknameSaving.current) return
         const trimmed = nicknameInput.trim()
         const newVal = trimmed === '' ? null : trimmed
         if (newVal === (unit.nickname ?? null)) return
         nicknameSaving.current = true
         nicknameFeedback.clear()
         try {
           const result = await updateNicknameFn({ data: { armyId, unitId, nickname: newVal } })
           if (result.success) {
             nicknameFeedback.show('Surnom enregistré', false)
             await onMutationSuccess()
           } else {
             nicknameFeedback.show(result.error?.message ?? 'Erreur', true)
           }
         } catch {
           nicknameFeedback.show('Erreur réseau', true)
         } finally {
           nicknameSaving.current = false
         }
       }
       ```
    5. Add nickname edit section at the top of the panel body (after the header, before the sub-profiles section):
       ```tsx
       {/* Nickname (blur-save) */}
       <div style={{ marginBottom: '1rem' }}>
         <Label htmlFor={`nickname-${unitId}`} style={{ fontSize: '0.8rem' }}>Surnom</Label>
         <Input
           id={`nickname-${unitId}`}
           value={nicknameInput}
           onChange={(e) => setNicknameInput(e.target.value)}
           onBlur={handleNicknameBlur}
           disabled={nicknameSaving.current}
           placeholder="Aucun surnom"
           style={{ marginTop: '0.25rem' }}
         />
         <FeedbackMsg message={nicknameFeedback} />
       </div>
       ```
  - Notes: No "Enregistrer" button — saves on blur. Only calls server if value changed.

- [x] Task 11: Wire nickname props through route
  - File: `src/routes/armies/$armyId.tsx`
  - Action:
    1. Pass `updateNicknameFn={updateNicknameFn}` to `<UnitEditPanel>` (around line 693). No `unitNickname` prop — the component reads `unit.nickname` directly from the `unit` prop already passed.

- [x] Task 12: Generate Drizzle migration and push
  - Action: Run `pnpm db:generate && pnpm db:push`.
  - Notes: Nullable column addition — no data migration. Existing rows get `NULL` for `nickname`.

- [x] Task 13: Add parser tests for nickname extraction
  - File: `tests/owb-parser.test.ts`
  - Action: Add tests to the existing blocktext describe block:
    ```typescript
    it('[OWB-BT-009] extracts nickname from "Nickname, UnitType" format', () => {
      const result = parseOwbExport(army3text)
      const xlaco = result.units[0]
      expect(xlaco.nickname).toMatch(/Xlaco/)
      expect(xlaco.name).toMatch(/Saurus/)
    })

    it('[OWB-BT-010] units without comma have null nickname', () => {
      const army2text = readFileSync(resolve(ROOT, 'docs/army_2.txt'), 'utf-8')
      const result = parseOwbExport(army2text)
      for (const unit of result.units) {
        expect(unit.nickname, `${unit.name} should have null nickname`).toBeNull()
      }
    })

    it('[OWB-BT-011] all units with comma in original name have a nickname', () => {
      const result = parseOwbExport(army3text)
      const named = result.units.filter(u => u.nickname !== null)
      expect(named.length).toBeGreaterThan(0)
      // Chaque unité avec nickname doit aussi avoir un name non-vide
      for (const u of named) {
        expect(u.name.length).toBeGreaterThan(0)
      }
    })

    it('[OWB-BT-012] name field contains unit type after nickname extraction', () => {
      const result = parseOwbExport(army3text)
      const saurus = result.units.find(u => u.nickname?.includes('Gardiens'))
      expect(saurus).toBeDefined()
      expect(saurus!.name).toBe('Guerriers Saurus')
    })
    ```

- [x] Task 14: Add plaintext + nickname parser test
  - File: `tests/owb-parser.test.ts`
  - Action: Add an inline fixture test for plaintext format with a nickname:
    ```typescript
    it('[OWB-PT-NICK] handles plaintext format with nickname (comma in unit name)', () => {
      const plaintext = `Les Braves, Orques et Gobelins [300 pts],
    Warhammer: The Old World, Orques et Gobelins, Colonne de Bataille
    Personnages [100 pts],
    Gork le Terrible, Boss Orque [100 pts]
    (Arme lourde, Armure lourde)
    ,
    [Orc Warboss] M(4) CC(5) CT(3) F(5) E(4) PV(3) I(3) A(4) Cd(8),
    Unites de base [200 pts],
    20 Garcons Orques [200 pts]
    (Armes de base, Boucliers)
    ,
    [Orc Boy] M(4) CC(3) CT(3) F(3) E(4) PV(1) I(2) A(1) Cd(7),
    [Boss] M(4) CC(3) CT(3) F(3) E(4) PV(1) I(2) A(2) Cd(7),`
      const result = parseOwbExport(plaintext)
      expect(result.units[0].nickname).toBe('Gork le Terrible')
      expect(result.units[0].name).toBe('Boss Orque')
      expect(result.units[1].nickname).toBeNull()
      expect(result.units[1].name).toBe('Garcons Orques')
    })
    ```
  - Notes: Validates that the normalizer correctly preserves commas in unit names during plaintext → markdown conversion, and that the parser then splits nickname correctly.
  - Also add a CRLF variant test:
    ```typescript
    it('[OWB-PT-NICK-CRLF] handles CRLF line endings in plaintext with nickname', () => {
      const plaintext = `Les Braves, Orques et Gobelins [300 pts],
    Warhammer: The Old World, Orques et Gobelins, Colonne de Bataille
    Personnages [100 pts],
    Gork le Terrible, Boss Orque [100 pts]
    (Arme lourde, Armure lourde)
    ,
    [Orc Warboss] M(4) CC(5) CT(3) F(5) E(4) PV(3) I(3) A(4) Cd(8),
    Unites de base [200 pts],
    20 Garcons Orques [200 pts]
    (Armes de base, Boucliers)
    ,
    [Orc Boy] M(4) CC(3) CT(3) F(3) E(4) PV(1) I(2) A(1) Cd(7),
    [Boss] M(4) CC(3) CT(3) F(3) E(4) PV(1) I(2) A(2) Cd(7),`.replace(/\n/g, '\r\n')
      const result = parseOwbExport(plaintext)
      expect(result.units[0].nickname).toBe('Gork le Terrible')
      expect(result.units[0].name).toBe('Boss Orque')
    })
    ```

- [x] Task 15: Add UnitCard render tests for nickname
  - File: `tests/2-3-unit-card.test.tsx` (or `src/components/__tests__/unit-card-nickname.test.tsx`)
  - Action: Add tests:
    ```typescript
    it('displays nickname as primary label when present', () => {
      // Render UnitCard with unit.nickname = "Xlaco-Tok", unit.name = "Saurus Scar-Veteran"
      // Assert: primary text is "Xlaco-Tok", secondary text "Saurus Scar-Veteran" is visible
    })

    it('displays unit name as primary label when no nickname', () => {
      // Render UnitCard with unit.nickname = null, unit.name = "Guerriers Saurus"
      // Assert: primary text is "Guerriers Saurus", no secondary text
    })
    ```

- [x] Task 16: Add server function test for updateNicknameFn
  - File: `tests/unit-nickname-server.test.ts` (new file)
  - Action: Test following the pattern in `tests/2-4-unit-deltas-server.test.ts`:
    ```typescript
    // Test: update nickname → success, returns success: true
    // Test: clear nickname (empty string) → sets to null
    // Test: unit not in army → returns BAD_REQUEST error
    ```

### Acceptance Criteria

- [x] AC 1: Given an army imported from OWB text with "Nickname, UnitType" format, when the import completes, then each unit has `nickname` set to the text before the first comma and `name` set to the text after.
- [x] AC 2: Given an army imported from OWB text without commas in unit names, when the import completes, then each unit has `nickname` set to `NULL` and `name` unchanged.
- [x] AC 3: Given a unit with a nickname, when viewing the army page, then the nickname is displayed as the primary label (Cinzel font, large) and the unit type name is displayed below as secondary text (Inter font, 0.8rem, secondary color).
- [x] AC 4: Given a unit without a nickname, when viewing the army page, then the unit name is displayed as the primary label (same as current behavior).
- [x] AC 5: Given the army owner opens the edit panel for a unit, when they see the panel, then there is a "Surnom" text input field showing the current nickname (or empty if none).
- [x] AC 6: Given the army owner edits the nickname field and tabs/clicks away (blur), when the value has changed, then the nickname is saved automatically and the unit card updates.
- [x] AC 7: Given the army owner clears the nickname field and blurs, when the server responds, then the nickname is set to NULL and the unit card reverts to showing only the unit name.
- [x] AC 8: Given a non-owner views the army page, when they see a unit with a nickname, then the nickname is displayed but no edit controls are shown.
- [x] AC 9: Given a plaintext OWB export with "Nickname, UnitType" format, when the import completes, then the nickname is correctly extracted (same as blocktext format).

## Additional Context

### Dependencies

None — self-contained feature. No new packages required.

### Testing Strategy

**Unit tests (Vitest):**
- Parser: nickname extraction from blocktext (army_3_txt) — nickname present (Task 13)
- Parser: plaintext format (army_2.txt) — nickname null (Task 13)
- Parser: plaintext with nickname inline fixture (Task 14)
- Parser: verify name field is cleaned (unit type only, no nickname prefix) (Task 13)
- UnitCard: render with nickname → primary/secondary display (Task 15)
- UnitCard: render without nickname → normal display (Task 15)
- Server fn: update nickname success, clear to null, bad army check (Task 16)

**Manual testing:**
- Import army_3_txt → verify nicknames appear in UI
- Import army_2.txt → verify no nicknames, normal display
- Edit panel: blur on nickname field → verify auto-save
- Edit panel: clear nickname + blur → verify display reverts
- Edit panel: modify existing nickname + blur → verify display updates
- Non-owner: verify nickname displayed without edit controls

### Known Limitations

- **Search/filter by unit name**: If a search or filter mechanism is added in the future, it must query both `nickname` and `name` fields (e.g., `WHERE nickname ILIKE $q OR name ILIKE $q`). No search feature exists currently — no immediate impact.

### Notes

- **Invariant**: OWB unit type names never contain commas. The comma separator in unit lines is only present when users add a custom nickname prefix in Old World Builder. This invariant has been verified across `army_example.txt`, `army_2.txt`, and `army_3_txt`. If OWB ever changes this format, the parser will incorrectly split the type name — document this as a known limitation.
- For characters, the "nickname" is typically the character's proper name (e.g., "Xlaco-Tok"), which is the most natural display.
- Existing armies in the database will have `NULL` nicknames after migration — no data backfill needed.
- The graveyard view (`getGraveyardUnits`) also receives the nickname (Task 6). If the graveyard UI component displays unit names, it should also respect the `nickname ?? name` pattern.
- Future consideration (out of scope): bulk nickname editing, nickname search/filter.
