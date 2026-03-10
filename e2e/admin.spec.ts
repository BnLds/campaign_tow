// e2e/admin.spec.ts
// Story 1.4: Admin — Player Account Creation
// Status: RED — written before implementation (TDD red phase)
//
// Pre-conditions (handled by global-setup.ts):
//   - Admin user (e2e_admin) exists with isAdmin = true, auth saved to .auth/admin.json
//   - Non-admin user auth available via .auth/first-login.json (existing)
//
// IMPORTANT: global-setup.ts must be updated to create e2e_admin user and save
//            its auth state to .auth/admin.json before un-skipping these tests.
//
// All tests use test.skip() — TDD red phase.
// Remove test.skip() after implementing the feature and verify green phase.

import { test, expect } from '@playwright/test'

const ADMIN_STATE = '.auth/admin.json'
const NON_ADMIN_STATE = '.auth/first-login.json'

test.describe('[Story 1.4] Admin Player Account Creation — E2E (ATDD)', () => {
  // ---------------------------------------------------------------------------
  // AC1 — Admin navigates to /admin and sees create-player form
  // ---------------------------------------------------------------------------

  test.describe('AC1: admin route', () => {
    test.use({ storageState: ADMIN_STATE })

    test('[1.4-E2E-001][P0][AC1] admin navigates to /admin and sees create-player form', async ({
      page,
    }) => {
      // THIS TEST WILL FAIL — /admin route not implemented yet
      await page.goto('/admin')

      // Admin page title in Cinzel font
      await expect(page.getByRole('heading', { name: /administration/i })).toBeVisible()

      // Create player section
      await expect(page.getByRole('heading', { name: /créer un compte joueur/i })).toBeVisible()

      // Username field
      await expect(page.getByLabel(/nom d'utilisateur/i)).toBeVisible()

      // Temporary password field
      await expect(page.getByLabel(/mot de passe temporaire/i)).toBeVisible()

      // Submit button
      await expect(page.getByRole('button', { name: /créer le compte/i })).toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // AC2 — Admin creates player successfully — success message shown
  // ---------------------------------------------------------------------------

  test.describe('AC2: player creation', () => {
    test.use({ storageState: ADMIN_STATE })

    test('[1.4-E2E-002][P0][AC2] admin submits valid form — player created, success message shown', async ({
      page,
    }) => {
      // THIS TEST WILL FAIL — /admin route not implemented yet
      await page.goto('/admin')

      const usernameInput = page.getByLabel(/nom d'utilisateur/i)
      const passwordInput = page.getByLabel(/mot de passe temporaire/i)
      const submitButton = page.getByRole('button', { name: /créer le compte/i })

      const testUsername = `e2e_player_${Date.now()}`

      await usernameInput.fill(testUsername)
      await passwordInput.fill('TempPass123!')
      await submitButton.click()

      // Success message shows the created username
      await expect(page.getByText(new RegExp(`compte créé.*${testUsername}`, 'i'))).toBeVisible()

      // Form resets after success
      await expect(usernameInput).toHaveValue('')
    })
  })

  // ---------------------------------------------------------------------------
  // AC4 — Non-admin is redirected from /admin to /
  // ---------------------------------------------------------------------------

  test.describe('AC4: non-admin access denied', () => {
    test.use({ storageState: NON_ADMIN_STATE })

    test('[1.4-E2E-003][P0][AC4] non-admin user is redirected from /admin to /', async ({
      page,
    }) => {
      // THIS TEST WILL FAIL — /admin route not implemented yet
      await page.goto('/admin')

      // Must be redirected to campaign view — admin page must not be accessible
      await expect(page).toHaveURL('/')

      // Admin heading must not be visible
      await expect(page.getByRole('heading', { name: /administration/i })).not.toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // AC5 — Duplicate username shows validation error
  // ---------------------------------------------------------------------------

  test.describe('AC5: duplicate username validation', () => {
    test.use({ storageState: ADMIN_STATE })

    test('[1.4-E2E-004][P1][AC5] submitting a duplicate username shows validation error', async ({
      page,
    }) => {
      // THIS TEST WILL FAIL — /admin route not implemented yet
      await page.goto('/admin')

      // Use a known existing username (admin user created by seed-admin)
      const usernameInput = page.getByLabel(/nom d'utilisateur/i)
      const passwordInput = page.getByLabel(/mot de passe temporaire/i)
      const submitButton = page.getByRole('button', { name: /créer le compte/i })

      await usernameInput.fill('admin')
      await passwordInput.fill('TempPass123!')
      await submitButton.click()

      // Validation error displayed — no new account created
      await expect(page.getByText(/ce nom d'utilisateur existe déjà/i)).toBeVisible()

      // Form stays open — error does not navigate away
      await expect(page.getByRole('heading', { name: /administration/i })).toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // AC3 — Newly created player can log in and sees WelcomeModal
  // ---------------------------------------------------------------------------

  test.describe('AC3: new player sees WelcomeModal', () => {
    // Note: This test requires fresh player creation + login — requires admin auth for setup.
    // The test itself uses a fresh browser context (no storageState) to login as new player.

    test('[1.4-E2E-005][P2][AC3] newly created player logs in and sees WelcomeModal', async ({
      browser,
    }) => {
      // THIS TEST WILL FAIL — /admin route not implemented yet
      //
      // Setup: Create player via admin UI in a separate context
      const adminContext = await browser.newContext({
        storageState: ADMIN_STATE,
      })
      const adminPage = await adminContext.newPage()
      await adminPage.goto('/admin')

      const testUsername = `e2e_new_player_${Date.now()}`
      const testPassword = 'TempPass456!'

      await adminPage.getByLabel(/nom d'utilisateur/i).fill(testUsername)
      await adminPage.getByLabel(/mot de passe temporaire/i).fill(testPassword)
      await adminPage.getByRole('button', { name: /créer le compte/i }).click()

      // Verify player was created
      await expect(adminPage.getByText(new RegExp(`compte créé.*${testUsername}`, 'i'))).toBeVisible()
      await adminContext.close()

      // Now login as the new player in a fresh context (no prior auth)
      const playerContext = await browser.newContext()
      const playerPage = await playerContext.newPage()

      await playerPage.goto('/login')
      await playerPage.getByTestId('login-username-input').fill(testUsername)
      await playerPage.getByTestId('login-password-input').fill(testPassword)
      await playerPage.getByTestId('login-submit-button').click()

      // Redirect to campaign view after successful login
      await playerPage.waitForURL('/')

      // WelcomeModal must appear (hasSeenWelcome = false for new players)
      await expect(playerPage.getByRole('dialog')).toBeVisible()
      await expect(
        playerPage.getByRole('heading', { name: /bienvenue dans campaign tow/i }),
      ).toBeVisible()

      await playerContext.close()
    })
  })
})
