// e2e/welcome-modal.spec.ts
// Story 1.3: First-Login Welcome Modal & Display Name
// Status: GREEN — E2E tests active (TDD green phase)
//
// Pre-conditions (handled by global-setup.ts + beforeEach):
//   - App server running at baseURL (via playwright.config.ts webServer)
//   - e2e_first_login user exists in DB with hasSeenWelcome = false
//   - e2e_returning user exists in DB with hasSeenWelcome = true
//   - Auth cookies saved in .auth/ by globalSetup

import { test, expect } from '@playwright/test'
import { closeTestDb, resetFirstLoginUser } from './helpers/db.ts'

const FIRST_LOGIN_STATE = '.auth/first-login.json'
const RETURNING_STATE = '.auth/returning.json'

test.describe('[Story 1.3] Welcome Modal — E2E User Journeys (ATDD)', () => {
  // ---------------------------------------------------------------------------
  // AC1–AC4: First-login user (hasSeenWelcome = false)
  // beforeEach resets DB state so each test sees a fresh modal.
  // ---------------------------------------------------------------------------

  test.describe('AC1–AC4: first-login user', () => {
    test.use({ storageState: FIRST_LOGIN_STATE })

    test.beforeEach(async () => {
      await resetFirstLoginUser()
    })

    test.afterAll(async () => {
      await closeTestDb()
    })

    // -------------------------------------------------------------------------
    // AC1 — Welcome modal appears on first login
    // -------------------------------------------------------------------------

    test('[1.3-E2E-001][P0][AC1] first-login user sees WelcomeModal on campaign view', async ({
      page,
    }) => {
      await page.goto('/')

      // Modal must be visible immediately after navigation
      await expect(page.getByRole('dialog')).toBeVisible()

      // Title in Cinzel font, navy brand color
      await expect(
        page.getByRole('heading', { name: 'Bienvenue dans Campaign TOW' }),
      ).toBeVisible()

      // Admin contact info
      await expect(page.getByText(/contactez Ben/i)).toBeVisible()

      // Display name field pre-filled with current name
      await expect(page.getByLabel(/nom d'affichage/i)).toBeVisible()

      // Two action buttons present
      await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Continuer sans modifier' })).toBeVisible()
    })

    // -------------------------------------------------------------------------
    // AC2 — Dismissing the modal marks it as seen
    // -------------------------------------------------------------------------

    test('[1.3-E2E-002][P0][AC2] clicking dismiss button closes modal', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('dialog')).toBeVisible()

      await page.getByRole('button', { name: 'Continuer sans modifier' }).click()

      // Modal must close after dismiss
      await expect(page.getByRole('dialog')).not.toBeVisible()

      // Campaign view must still be rendered
      await expect(page.getByRole('main')).toBeVisible()
    })

    test('[1.3-E2E-003][P1][AC2] pressing Escape closes modal — onOpenChange handler', async ({
      page,
    }) => {
      await page.goto('/')
      await expect(page.getByRole('dialog')).toBeVisible()

      await page.keyboard.press('Escape')

      // Modal must close via shadcn Dialog onOpenChange → onDismiss
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    // -------------------------------------------------------------------------
    // AC3 — Display name update succeeds
    // -------------------------------------------------------------------------

    test('[1.3-E2E-004][P0][AC3] submitting a valid display name updates it and closes modal', async ({
      page,
    }) => {
      await page.goto('/')
      await expect(page.getByRole('dialog')).toBeVisible()

      const nameInput = page.getByLabel(/nom d'affichage/i)
      await nameInput.clear()
      await nameInput.fill('Thomas Legrand')

      await page.getByRole('button', { name: 'Enregistrer' }).click()

      // Modal closes after successful update
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    // -------------------------------------------------------------------------
    // AC4 — Validation rejects empty/whitespace display names
    // -------------------------------------------------------------------------

    test('[1.3-E2E-005][P0][AC4] empty display name shows inline validation error', async ({
      page,
    }) => {
      await page.goto('/')
      await expect(page.getByRole('dialog')).toBeVisible()

      const nameInput = page.getByLabel(/nom d'affichage/i)
      await nameInput.clear()

      await page.getByRole('button', { name: 'Enregistrer' }).click()

      // Inline validation error — not a toast, displayed below the field
      await expect(page.getByText('Display name is required')).toBeVisible()

      // Modal stays open — validation failure does not dismiss
      await expect(page.getByRole('dialog')).toBeVisible()
    })

    test('[1.3-E2E-006][P1][AC4] whitespace-only display name shows inline validation error', async ({
      page,
    }) => {
      await page.goto('/')
      await expect(page.getByRole('dialog')).toBeVisible()

      const nameInput = page.getByLabel(/nom d'affichage/i)
      await nameInput.clear()
      await nameInput.fill('   ')

      await page.getByRole('button', { name: 'Enregistrer' }).click()

      // Zod .trim().min(1) trims whitespace then rejects empty string
      await expect(page.getByText('Display name is required')).toBeVisible()
      await expect(page.getByRole('dialog')).toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // AC5 — Modal does not appear on subsequent logins (hasSeenWelcome = true)
  // ---------------------------------------------------------------------------

  test.describe('AC5: returning user', () => {
    test.use({ storageState: RETURNING_STATE })

    test('[1.3-E2E-007][P0][AC5] modal does not appear when hasSeenWelcome is true', async ({
      page,
    }) => {
      await page.goto('/')

      // No dialog should be visible — returning user skips the modal
      await expect(page.getByRole('dialog')).not.toBeVisible()

      // Campaign view renders normally
      await expect(page.getByRole('main')).toBeVisible()
    })
  })
})