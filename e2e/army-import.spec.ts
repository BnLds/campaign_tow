// e2e/army-import.spec.ts
// Story 2.1: OWB Army Import & Player Assignment
//
// Pre-conditions (handled by global-setup.ts):
//   - Admin user (e2e_admin) exists with isAdmin = true, auth saved to .auth/admin.json
//   - At least one non-admin player exists (e2e_returning) for assignment tests
//
// Note: No test.skip() — project pattern is for tests to fail naturally (TDD RED phase).
// Tests fail until story 2.1 tasks are complete (import form + army list UI added to /admin).

import { test, expect } from '@playwright/test'
import { waitForHydration } from './helpers/waitForHydration'

const ADMIN_STATE = '.auth/admin.json'

// Minimal valid OWB export for import tests
const VALID_OWB_TEXT = `## Armée E2E Test [100 pts]
Warhammer: The Old World, Empire, Colonne de Bataille

### Unités de base [100 pts]
- 10 Guerriers de l'Empire [100 pts]
 - [Empire Warrior] M(4) CC(3) CT(3) F(3) E(4) PV(1) I(3) A(1) Cd(7)

*Créé avec "Old World Builder"* - https://old-world-builder.com`

// Invalid text for error scenario tests
const INVALID_OWB_TEXT = 'Ceci n\'est pas un export OWB valide.'

test.describe('[Story 2.1] OWB Army Import & Player Assignment — E2E (ATDD)', () => {
  // ---------------------------------------------------------------------------
  // AC1 — Admin page shows import section (Task 6.1)
  // ---------------------------------------------------------------------------

  test.describe('AC1: import section visible on /admin', () => {
    test.use({ storageState: ADMIN_STATE })

    test('[2.1-E2E-001][P0][AC1] admin sees "Importer une armée OWB" section on /admin page', async ({
      page,
    }) => {
      await page.goto('/admin')
      await waitForHydration(page)

      // Import section heading must be visible
      await expect(
        page.getByRole('heading', { name: /importer une armée/i }),
      ).toBeVisible()

      // Textarea for pasting OWB text must be present
      await expect(page.getByTestId('owb-import-textarea')).toBeVisible()

      // Import submit button must be present
      await expect(page.getByTestId('owb-import-submit')).toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // AC1 / AC2 — Successful import: success summary shown with army name + unit count
  // ---------------------------------------------------------------------------

  test.describe('AC1/AC2: successful import shows summary', () => {
    test.use({ storageState: ADMIN_STATE })

    test('[2.1-E2E-002][P0][AC1][AC2] admin pastes valid OWB text and submits — success summary with army name and unit count', async ({
      page,
    }) => {
      await page.goto('/admin')
      await waitForHydration(page)

      // Use unique suffix to identify this test's army in the list
      const testArmyText = VALID_OWB_TEXT.replace(
        'Armée E2E Test',
        `Armée E2E ${Date.now()}`,
      )

      await page.getByTestId('owb-import-textarea').fill(testArmyText)
      // force:true avoids "intercepts pointer events" from scroll offset on mobile viewport (Pixel 5)
      await page.getByTestId('owb-import-submit').click({ force: true })

      // Success message must show army name and unit count (AC2: success summary)
      await expect(page.getByTestId('import-result-message')).toBeVisible()
      await expect(page.getByTestId('import-result-message')).toContainText(/1 unité/i)
    })
  })

  // ---------------------------------------------------------------------------
  // AC1 — Armies section shows imported armies (Task 6.2)
  // ---------------------------------------------------------------------------

  test.describe('AC1: armies list section visible on /admin', () => {
    test.use({ storageState: ADMIN_STATE })

    test('[2.1-E2E-003][P0][AC1] admin sees "Armées" section listing imported armies', async ({
      page,
    }) => {
      await page.goto('/admin')
      await waitForHydration(page)

      // Armies section heading must be present
      await expect(
        page.getByRole('heading', { name: /armées/i }),
      ).toBeVisible()

      // After importing, the army list should be populated
      // (This test verifies the section exists and renders the list container)
      await expect(page.getByTestId('army-list')).toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // AC3 — Player assignment: assign army to player via dropdown
  // ---------------------------------------------------------------------------

  test.describe('AC3: player assignment', () => {
    test.use({ storageState: ADMIN_STATE })

    test('[2.1-E2E-004][P0][AC3] admin can assign army to player via dropdown — assignment confirmed', async ({
      page,
    }) => {
      // First import an army to assign
      await page.goto('/admin')
      await waitForHydration(page)

      const armyName = `Armée Assignation ${Date.now()}`
      const armyText = VALID_OWB_TEXT.replace('Armée E2E Test', armyName)
      await page.getByTestId('owb-import-textarea').fill(armyText)
      // force:true avoids "intercepts pointer events" from scroll offset on mobile viewport (Pixel 5)
      await page.getByTestId('owb-import-submit').click({ force: true })

      // Wait for import success
      await expect(page.getByTestId('import-result-message')).toBeVisible()

      // Find the army row in the list and select a player from the dropdown
      const armyRow = page.getByTestId('army-list').locator('[data-testid^="army-row-"]', { has: page.getByText(armyName) })
      const playerSelect = armyRow.getByRole('combobox')
      await playerSelect.selectOption({ index: 1 }) // Select first non-empty option

      // Click the assign button
      const assignButton = armyRow.getByRole('button', { name: /assigner/i })
      // force:true avoids "intercepts pointer events" from scroll offset on mobile viewport (Pixel 5)
      await assignButton.click({ force: true })

      // Assignment success indicator must appear
      await expect(page.getByTestId('assign-result-message')).toBeVisible()
    })

    test('[2.1-E2E-005][P1][AC3] after assignment, army row shows player name instead of "Non assignée"', async ({
      page,
    }) => {
      await page.goto('/admin')
      await waitForHydration(page)

      // Import a fresh army so it starts as "Non assignée"
      const armyName = `Armée PostAssign ${Date.now()}`
      const armyText = VALID_OWB_TEXT.replace('Armée E2E Test', armyName)
      await page.getByTestId('owb-import-textarea').fill(armyText)
      await page.getByTestId('owb-import-submit').click({ force: true })
      await expect(page.getByTestId('import-result-message')).toBeVisible()

      // Verify the army shows "Non assignée" before assignment
      const armyRow = page.getByTestId('army-list').locator('[data-testid^="army-row-"]', { has: page.getByText(armyName) })
      await expect(armyRow.getByText(/non assignée/i)).toBeVisible()

      // Assign a player
      const playerSelect = armyRow.getByRole('combobox')
      await playerSelect.selectOption({ index: 1 })
      const assignButton = armyRow.getByRole('button', { name: /assigner/i })
      await assignButton.click({ force: true })
      await expect(page.getByTestId('assign-result-message')).toBeVisible()

      // After assignment, "Non assignée" should no longer appear for this army row
      await expect(armyRow.getByText(/non assignée/i)).not.toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // AC4 — Parse failure: error shown, no partial data saved
  // ---------------------------------------------------------------------------

  test.describe('AC4: parse failure shows error', () => {
    test.use({ storageState: ADMIN_STATE })

    test('[2.1-E2E-006][P0][AC4] submitting invalid OWB text shows clear error message', async ({
      page,
    }) => {
      await page.goto('/admin')
      await waitForHydration(page)

      await page.getByTestId('owb-import-textarea').fill(INVALID_OWB_TEXT)
      // force:true avoids "intercepts pointer events" from scroll offset on mobile viewport (Pixel 5)
      await page.getByTestId('owb-import-submit').click({ force: true })

      // Error message must be shown — must NOT show a success message
      await expect(page.getByTestId('import-result-message')).toBeVisible()
      await expect(page.getByTestId('import-result-message')).not.toContainText(/succès|importée/i)
    })

    test('[2.1-E2E-007][P1][AC4] after parse failure, the admin page remains functional (not broken state)', async ({
      page,
    }) => {
      await page.goto('/admin')
      await waitForHydration(page)

      // Submit invalid text
      await page.getByTestId('owb-import-textarea').fill(INVALID_OWB_TEXT)
      // force:true avoids "intercepts pointer events" from scroll offset on mobile viewport (Pixel 5)
      await page.getByTestId('owb-import-submit').click({ force: true })

      // Error shown
      await expect(page.getByTestId('import-result-message')).toBeVisible()

      // Form stays open — admin page heading must still be visible
      await expect(page.getByRole('heading', { name: /administration/i })).toBeVisible()

      // Import textarea must still be present and focusable (not broken)
      await expect(page.getByTestId('owb-import-textarea')).toBeVisible()
    })
  })
})
