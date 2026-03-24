// e2e/initial-xp-consequences.spec.ts
// Story: Initial XP — Destruction Consequences Multi-Select
//
// Full E2E: creates initial_setup match, adds mixed past consequences via wizard,
// completes wizard, verifies DB state (stat_modifiers, unit_gains).
//
// Pre-conditions (handled by global-setup.ts):
//   - e2e_returning player exists, auth saved to .auth/returning.json
//   - e2e_admin player exists (used as the "other player" for haine/rancune target)
//
// Setup: each test creates a fresh army + units + initial_setup match via DB helper,
// then cleans up after itself.

import { test, expect } from '@playwright/test'
import { eq, inArray } from 'drizzle-orm'
import { getTestDb, closeTestDb } from './helpers/db'
import { waitForHydration } from './helpers/waitForHydration'
import * as schema from '../src/db/schema'

const RETURNING_AUTH = '.auth/returning.json'

// ---------------------------------------------------------------------------
// DB setup helpers
// ---------------------------------------------------------------------------

type TestFixtures = {
  playerId: string
  armyId: string
  personnagesUnitId: string
  cavalerieUnitId: string
  matchId: string
  participantId: string
}

async function createInitialXpFixture(): Promise<TestFixtures> {
  const db = getTestDb()

  // Get the e2e_returning player
  const [player] = await db
    .select({ id: schema.players.id })
    .from(schema.players)
    .where(eq(schema.players.username, 'e2e_returning'))
    .limit(1)
  if (!player) throw new Error('e2e_returning player not found — run global-setup first')

  // Remove any existing army for this player (clean slate)
  await db.delete(schema.armies).where(eq(schema.armies.playerId, player.id))

  // Create a fresh army
  const [army] = await db
    .insert(schema.armies)
    .values({ name: 'E2E Armée Test Conséquences', faction: 'Empire', playerId: player.id, needsInitialXp: true })
    .returning({ id: schema.armies.id })
  if (!army) throw new Error('Failed to create test army')

  // Create a Personnages unit (for permanent_injury)
  const [personnagesUnit] = await db
    .insert(schema.units)
    .values({ armyId: army.id, name: 'Capitaine E2E', type: 'Personnages', xp: 0 })
    .returning({ id: schema.units.id })
  if (!personnagesUnit) throw new Error('Failed to create Personnages unit')

  // Add a minimal sub-profile so the loader doesn't crash
  await db.insert(schema.subProfiles).values({
    unitId: personnagesUnit.id,
    label: 'Capitaine',
    isMount: false,
    sortOrder: 0,
    cc: '4',
    ct: '3',
    f: '4',
    e: '3',
    pv: '2',
    i: '4',
    a: '2',
    cd: '8',
  })

  // Create a non-Personnages unit (for rancune / moral_brise)
  const [cavalerieUnit] = await db
    .insert(schema.units)
    .values({ armyId: army.id, name: 'Chevaliers E2E', type: 'Cavalerie', xp: 0 })
    .returning({ id: schema.units.id })
  if (!cavalerieUnit) throw new Error('Failed to create Cavalerie unit')

  await db.insert(schema.subProfiles).values({
    unitId: cavalerieUnit.id,
    label: 'Chevalier',
    isMount: false,
    sortOrder: 0,
    cc: '3',
    ct: '3',
    f: '4',
    e: '3',
    pv: '1',
    i: '3',
    a: '1',
    cd: '7',
  })

  // Create an initial_setup match
  const [match] = await db
    .insert(schema.matches)
    .values({ date: new Date(), matchType: 'initial_setup', createdByPlayerId: player.id })
    .returning({ id: schema.matches.id })
  if (!match) throw new Error('Failed to create initial_setup match')

  // Create a match_participant for this player/army
  const [participant] = await db
    .insert(schema.matchParticipants)
    .values({ matchId: match.id, playerId: player.id, armyId: army.id })
    .returning({ id: schema.matchParticipants.id })
  if (!participant) throw new Error('Failed to create match_participant')

  return {
    playerId: player.id,
    armyId: army.id,
    personnagesUnitId: personnagesUnit.id,
    cavalerieUnitId: cavalerieUnit.id,
    matchId: match.id,
    participantId: participant.id,
  }
}

async function cleanupFixture(fixtures: TestFixtures): Promise<void> {
  const db = getTestDb()
  // Cascade delete: match → participants → xp_entries / unit_gains / stat_modifiers
  await db.delete(schema.matches).where(eq(schema.matches.id, fixtures.matchId))
  // Army cascade also removes units, sub_profiles, unit_gains, stat_modifiers
  await db.delete(schema.armies).where(eq(schema.armies.id, fixtures.armyId))
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('[INIT-CSQ-E2E] Initial XP — past consequences full flow', () => {
  test.use({ storageState: RETURNING_AUTH })

  let fixtures: TestFixtures

  test.beforeEach(async () => {
    fixtures = await createInitialXpFixture()
  })

  test.afterEach(async () => {
    await cleanupFixture(fixtures)
  })

  test.afterAll(async () => {
    await closeTestDb()
  })

  // -------------------------------------------------------------------------
  // [INIT-CSQ-E2E-001] Full flow: permanent_injury + rancune + moral_brise
  // -------------------------------------------------------------------------

  test('[INIT-CSQ-E2E-001] adds mixed consequences and verifies DB state', async ({ page }) => {
    await page.goto(`/match/${fixtures.matchId}/post-match`)
    await waitForHydration(page)

    // --- Unit 1: Capitaine (Personnages) — add permanent_injury to CC ---

    await expect(page.getByTestId('wizard-unit-name')).toContainText('Capitaine E2E')
    await expect(page.getByTestId('initial-consequence-add-btn')).toBeVisible()

    // Open consequence form
    await page.getByTestId('initial-consequence-add-btn').click()

    // Select permanent_injury
    await page.getByTestId('initial-consequence-type-permanent_injury').check()

    // Select CC stat
    await page.getByTestId('initial-consequence-stat-cc').check()

    // Confirm
    await page.getByTestId('initial-consequence-confirm-btn').click()

    // Chip should appear
    await expect(page.getByText(/Blessure Permanente.*CC/i)).toBeVisible()

    // Enter XP (0 = no XP in initial setup is valid)
    const xpInput = page.getByTestId('wizard-xp-numeric-input')
    await xpInput.fill('0')

    // Advance to next unit
    await page.getByTestId('wizard-next-button').click()

    // --- Unit 2: Chevaliers (Cavalerie) — add rancune ---

    await expect(page.getByTestId('wizard-unit-name')).toContainText('Chevaliers E2E')
    await expect(page.getByTestId('initial-consequence-add-btn')).toBeVisible()

    await page.getByTestId('initial-consequence-add-btn').click()
    await page.getByTestId('initial-consequence-type-rancune').check()

    // Select first available player from dropdown
    const playerSelect = page.getByTestId('initial-consequence-player-select')
    await expect(playerSelect).toBeVisible()
    const options = await playerSelect.locator('option').all()
    // Find first non-empty option (skip the placeholder "— Choisir un joueur —")
    const firstPlayer = options[1]
    const playerName = (await firstPlayer.textContent()) ?? ''
    await playerSelect.selectOption({ index: 1 })

    await page.getByTestId('initial-consequence-confirm-btn').click()
    await expect(page.getByText(new RegExp(`Rancune.*${playerName.trim()}`, 'i'))).toBeVisible()

    // Also add moral_brise to same unit
    await page.getByTestId('initial-consequence-add-btn').click()
    await page.getByTestId('initial-consequence-type-moral_brise').check()
    await page.getByTestId('initial-consequence-confirm-btn').click()
    await expect(page.getByText(/Moral Brisé/i)).toBeVisible()

    // Enter XP and complete
    const xpInput2 = page.getByTestId('wizard-xp-numeric-input')
    await xpInput2.fill('0')
    await page.getByTestId('wizard-next-button').click()

    // Wizard should complete (no tier-ups since XP=0 → no crossings)
    // Wait for navigation back to home or any sign of completion
    await page.waitForURL('/', { timeout: 15000 })

    // --- Verify DB state ---

    const db = getTestDb()

    // permanent_injury on CC → stat_modifier with stat='cc', delta=-1
    const statMods = await db
      .select()
      .from(schema.statModifiers)
      .where(eq(schema.statModifiers.unitId, fixtures.personnagesUnitId))

    expect(statMods.length).toBeGreaterThanOrEqual(1)
    const ccMod = statMods.find((m) => m.stat === 'cc' && m.delta === -1)
    expect(ccMod).toBeDefined()

    // rancune → unit_gain on cavalerieUnit with description containing player name
    const cavalerieGains = await db
      .select()
      .from(schema.unitGains)
      .where(eq(schema.unitGains.unitId, fixtures.cavalerieUnitId))

    expect(cavalerieGains.length).toBeGreaterThanOrEqual(2)

    const rancuneGain = cavalerieGains.find((g) =>
      g.description.toLowerCase().includes('rancune') ||
      g.description.toLowerCase().includes('haine')
    )
    expect(rancuneGain).toBeDefined()

    const moralGain = cavalerieGains.find((g) =>
      g.description.toLowerCase().includes('commandement') ||
      g.description.toLowerCase().includes('moral')
    )
    expect(moralGain).toBeDefined()
  })

  // -------------------------------------------------------------------------
  // [INIT-CSQ-E2E-002] No consequences — wizard completes cleanly
  // -------------------------------------------------------------------------

  test('[INIT-CSQ-E2E-002] wizard completes cleanly with zero consequences', async ({ page }) => {
    await page.goto(`/match/${fixtures.matchId}/post-match`)
    await waitForHydration(page)

    // For each unit, just submit XP without adding consequences
    // Unit 1 (Personnages)
    await expect(page.getByTestId('wizard-unit-name')).toContainText('Capitaine E2E')
    await expect(page.getByTestId('consequence-toggle')).toHaveCount(0)  // hidden in initial-xp
    await page.getByTestId('wizard-xp-numeric-input').fill('50')
    await page.getByTestId('wizard-next-button').click()

    // Unit 2 (Cavalerie)
    await expect(page.getByTestId('wizard-unit-name')).toContainText('Chevaliers E2E')
    await page.getByTestId('wizard-xp-numeric-input').fill('30')
    await page.getByTestId('wizard-next-button').click()

    // Wizard completes — should navigate away
    // May show tier-up step since XP > 0 — just wait for any evolution step or completion
    // For 50 XP Personnages (threshold may apply), handle possible tier-up
    // We don't assert specific tier-up behavior here — just verify no crash

    // Wait up to 15s for URL change or completion signal
    await page.waitForFunction(
      () => document.location.pathname === '/' || document.querySelector('[data-testid="wizard-complete"]') !== null,
      { timeout: 15000 }
    )

    // Verify no stat_modifiers or unit_gains were created for these units (no consequences)
    const db = getTestDb()
    const statMods = await db
      .select()
      .from(schema.statModifiers)
      .where(inArray(schema.statModifiers.unitId, [fixtures.personnagesUnitId, fixtures.cavalerieUnitId]))
    expect(statMods.length).toBe(0)
  })
})
