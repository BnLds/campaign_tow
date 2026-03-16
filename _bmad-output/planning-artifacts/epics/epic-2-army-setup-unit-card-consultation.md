# Epic 2: Army Setup & Unit Card Consultation

All armies are visible with their unit profiles, base stats, and campaign deltas. Ben can import and manage army data via OWB export or manual entry. Players can view and directly edit unit/character data.

## Story 2.1: OWB Army Import & Player Assignment

As Ben (admin),
I want to import an army from an Old World Builder text export and assign it to a player,
So that all armies are pre-loaded before the first session.

**Acceptance Criteria:**

**Given** I am logged in as admin,
**When** I paste an OWB text export into the import form and submit,
**Then** `owb-parser.ts` parses the export into structured army data (army name, units, sub-profiles with 9 stat columns), and the data is inserted into `armies`, `units`, and `sub_profiles` tables

**Given** a valid OWB export,
**When** parsing completes in under 5 seconds (NFR10),
**Then** a success summary is shown listing army name and number of units imported

**Given** I have imported an army,
**When** I select a player from the player list and confirm assignment,
**Then** `army.playerId` is updated and the army appears as that player's army (FR5)

**Given** the OWB export fails to parse,
**When** an error is detected,
**Then** a clear error message is shown and no partial data is saved

*Tables created by this story: `armies` (id, name, faction, playerId), `units` (id, armyId, name, type, xp), `sub_profiles` (id, unitId, label, m, cc, ct, f, e, pv, i, a, cd)*

---

## Story 2.2: Manual Unit Entry & Post-Import Correction

As Ben (admin),
I want to manually enter or correct unit data for an army,
So that armies with unparseable OWB exports or data errors are still usable.

**Acceptance Criteria:**

**Given** I am logged in as admin and viewing an army,
**When** I use the manual unit entry form to add a unit with its stats,
**Then** the unit and its sub-profile are created in the database (FR9)

**Given** a unit exists in an army,
**When** I edit its stats via the correction form and submit,
**Then** the `sub_profiles` base stats are updated and the unit card reflects the change (FR10)

**Given** I am logged in as a non-admin player,
**When** I attempt to access the admin unit entry or correction form,
**Then** access is denied

---

## Story 2.3: Unit Card Display with Campaign Deltas

As a player,
I want to view any unit card showing its base stats and all campaign deltas,
So that I can quickly read the current state of any unit during or before a game.

**Acceptance Criteria:**

**Given** a unit with base stats and no campaign deltas,
**When** I view its unit card,
**Then** the UnitCard component displays the 9-stat horizontal bar (m, cc, ct, f, e, pv, i, a, cd) using base stats from `sub_profiles`

**Given** a unit with entries in `stat_modifiers` and/or `unit_gains`,
**When** `composeUnitView(baseStats, statModifiers, unitGains)` is called,
**Then** the UnitCard shows modified stat values highlighted (green for bonus, red for penalty) and delta chips at the bottom

**Given** a unit has multiple sub-profiles,
**When** I view its unit card,
**Then** each sub-profile is displayed as a separate labeled section

**Given** I am logged in as any player,
**When** I navigate to any army's unit cards,
**Then** all armies are visible without restriction (FR12)

*Tables created by this story: `stat_modifiers` (id, unitId, stat, delta, source, temporary), `unit_gains` (id, unitId, description)*

---

## Story 2.4: Direct Edit of Unit & Character Deltas

As a player,
I want to directly add or edit bonuses, penalties, injuries, and XP on my own units and characters without going through the post-match flow,
So that I can set up my army's current state at any point in the campaign.

**Acceptance Criteria:**

**Given** I am logged in and viewing a unit of my army,
**When** I open the direct edit form and add a stat modifier (e.g. +1 Initiative, source: tier_up),
**Then** a new entry is created in `stat_modifiers` and the unit card updates to reflect the delta (FR13)

**Given** I am logged in and viewing a character of my army,
**When** I add a permanent injury (e.g. -1 Endurance, source: injury),
**Then** the entry is saved in `stat_modifiers` and displayed as a red delta on the character card (FR14)

**Given** I am logged in and viewing a unit of my army,
**When** I add a unit gain (e.g. ability "Mur de boucliers"),
**Then** the entry is saved in `unit_gains` and displayed in the delta chips section

**Given** I am logged in and viewing a unit of my army,
**When** I edit the total XP value directly via the edit form,
**Then** the unit's XP is updated in `units.xp` and the tier is recalculated accordingly (`calculateTier()`)

**Given** I am logged in and viewing a character of my army,
**When** I edit the total XP value directly via the edit form,
**Then** the character's XP is updated and the tier is recalculated accordingly

**Given** I attempt to edit a unit from another player's army,
**When** the mutation is submitted,
**Then** `armyOwnerMiddleware` blocks the request and an error is shown

---
