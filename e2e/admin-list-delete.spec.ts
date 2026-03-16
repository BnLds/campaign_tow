// e2e/admin-list-delete.spec.ts
// Story 1.6: Admin — Player Account List & Delete
//
// Pre-conditions (handled by global-setup.ts):
//   - Admin user (e2e_admin) exists with isAdmin = true, auth saved to .auth/admin.json
//   - Non-admin user (e2e_returning) exists, auth saved to .auth/returning.json
//   - Non-admin user (e2e_first_login) exists, auth saved to .auth/first-login.json
//
// Note: No test.skip() — project pattern is for tests to fail naturally (TDD RED phase).

import { test, expect } from '@playwright/test'
import { waitForHydration } from './helpers/waitForHydration'

const ADMIN_STATE = '.auth/admin.json'
const NON_ADMIN_STATE = '.auth/returning.json'

test.describe('[Story 1.6] Admin Player Account List & Delete — E2E (ATDD)', () => {
  // ---------------------------------------------------------------------------
  // AC1 — Admin sees "Administration" link in AppHeader; link navigates to /admin
  // ---------------------------------------------------------------------------

  test.describe('AC1: admin link in AppHeader (admin)', () => {
    test.use({ storageState: ADMIN_STATE })

    test('[1.6-E2E-001][P0][AC1] admin sees "Administration" link in AppHeader — link navigates to /admin', async ({
      page,
    }) => {
      await page.goto('/')
      await waitForHydration(page)

      // "Administration" link must be visible for admin user
      await expect(page.getByTestId('admin-link')).toBeVisible()
      await expect(page.getByTestId('admin-link')).toContainText(/administration/i)

      // Clicking the link navigates to /admin
      await page.getByTestId('admin-link').click()
      await expect(page).toHaveURL('/admin')
      await expect(page.getByRole('heading', { name: /administration/i })).toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // AC1 — Non-admin user: "Administration" link is absent from DOM entirely
  // ---------------------------------------------------------------------------

  test.describe('AC1: admin link absent for non-admin', () => {
    test.use({ storageState: NON_ADMIN_STATE })

    test('[1.6-E2E-002][P0][AC1] non-admin user: "Administration" link is absent from DOM (not just hidden)', async ({
      page,
    }) => {
      await page.goto('/')
      await waitForHydration(page)

      // Link must be absent from DOM entirely — not visible, not hidden via CSS, count = 0
      await expect(page.getByTestId('admin-link')).toHaveCount(0)
    })
  })

  // ---------------------------------------------------------------------------
  // AC2 — Admin page displays player list with usernames
  // ---------------------------------------------------------------------------

  test.describe('AC2: player list on admin page', () => {
    test.use({ storageState: ADMIN_STATE })

    test('[1.6-E2E-003][P0][AC2] admin page displays player list with known test player usernames', async ({
      page,
    }) => {
      await page.goto('/admin')
      await waitForHydration(page)

      // "Joueurs" section heading visible
      await expect(page.getByRole('heading', { name: /joueurs/i })).toBeVisible()

      // Known test players created by global-setup should appear in the list
      await expect(page.getByText('e2e_returning')).toBeVisible()
      await expect(page.getByText('e2e_first_login')).toBeVisible()

      // Delete buttons must be present for non-admin players
      await expect(page.locator('[data-testid^="delete-player-"]').first()).toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // AC3 — Cancelling the delete confirmation keeps player in list
  // ---------------------------------------------------------------------------

  test.describe('AC3: cancel delete confirmation', () => {
    test.use({ storageState: ADMIN_STATE })

    test('[1.6-E2E-004][P1][AC3] cancelling delete confirmation keeps player in list', async ({
      page,
    }) => {
      await page.goto('/admin')
      await waitForHydration(page)

      // Find the first available delete button (any deletable player)
      const firstDeleteButton = page.locator('[data-testid^="delete-player-"]').first()
      await expect(firstDeleteButton).toBeVisible()

      // Count delete buttons before cancellation
      const countBefore = await page.locator('[data-testid^="delete-player-"]').count()

      // Dismiss (cancel) the confirmation dialog
      page.on('dialog', (dialog) => dialog.dismiss())
      // force:true avoids "intercepts pointer events" from scroll offset on mobile viewport (Pixel 5)
      await firstDeleteButton.click({ force: true })

      // Delete button count must be unchanged — no player was deleted
      await expect(page.locator('[data-testid^="delete-player-"]')).toHaveCount(countBefore)
    })
  })

  // ---------------------------------------------------------------------------
  // AC3 + AC4 — Accepting delete confirmation removes player from list
  // ---------------------------------------------------------------------------

  test.describe('AC3 + AC4: confirm deletion — player disappears', () => {
    test.use({ storageState: ADMIN_STATE })

    test('[1.6-E2E-005][P1][AC3][AC4] accepting delete confirmation removes player from list', async ({
      page,
    }) => {
      await page.goto('/admin')
      await waitForHydration(page)

      // Setup: create a throwaway player via the admin creation form
      const throwawayUsername = `e2e_del_${Date.now()}`
      await page.getByLabel(/nom d'utilisateur/i).fill(throwawayUsername)
      await page.getByLabel(/mot de passe temporaire/i).fill('TempPass123!')
      await page.getByRole('button', { name: /créer le compte/i }).click()

      // Verify player was created (success banner)
      await expect(page.getByText(new RegExp(`compte créé.*${throwawayUsername}`, 'i'))).toBeVisible()

      // Locate the throwaway player's row in the list via its delete button's parent div.
      // Using the delete-button parent avoids strict mode violations caused by the username
      // appearing in multiple places (success banner + username span + displayName span).
      const throwawayPlayerRow = page
        .locator('[data-testid^="delete-player-"]')
        .locator('..')
        .filter({ hasText: throwawayUsername })

      // Throwaway player row must be present in the list
      await expect(throwawayPlayerRow).toBeVisible()

      // Accept the confirmation dialog when delete is clicked
      page.on('dialog', (dialog) => dialog.accept())

      // force:true avoids "intercepts pointer events" from scroll offset on mobile viewport (Pixel 5)
      await throwawayPlayerRow.locator('[data-testid^="delete-player-"]').click({ force: true })

      // Throwaway player row must no longer be present in the list after deletion
      await expect(throwawayPlayerRow).not.toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // AC5 — Admin's own row has no delete button (UI guard — self-delete prevented)
  // ---------------------------------------------------------------------------

  test.describe('AC5: self-delete UI guard', () => {
    test.use({ storageState: ADMIN_STATE })

    test("[1.6-E2E-006][P0][AC5] admin's own row has no delete button (UI guard — absent from DOM)", async ({
      page,
    }) => {
      await page.goto('/admin')
      await waitForHydration(page)

      // Admin's own username must appear in the player list
      await expect(page.getByText('e2e_admin')).toBeVisible()

      // But the row containing 'e2e_admin' must NOT have a delete button.
      // Check: no delete button's parent container contains the admin's username.
      const adminRowWithDeleteButton = page
        .locator('[data-testid^="delete-player-"]')
        .locator('..')
        .filter({ hasText: 'e2e_admin' })

      await expect(adminRowWithDeleteButton).toHaveCount(0)
    })
  })
})
