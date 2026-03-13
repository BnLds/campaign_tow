// e2e/logout.spec.ts
// Story 1.5: Player Logout
// Status: RED — written before implementation (ATDD)
//
// Pre-conditions (handled by global-setup.ts):
//   - e2e_returning user exists with hasSeenWelcome=true, auth saved to .auth/returning.json
//   - App server running at baseURL (via playwright.config.ts webServer)
//
// Tests that FAIL until story 1.5 is implemented:
//   [1.5-E2E-001] "Se déconnecter" button visible on authenticated pages
//   [1.5-E2E-002] Identity indicator (displayName) visible in header
//   [1.5-E2E-003] Clicking "Se déconnecter" redirects to /login
//   [1.5-E2E-004] After logout, navigating to / redirects to /login (session cleared)
//   [1.5-E2E-005] After logout, browser back button stays on /login (AC3)
//
// Test that PASSES (regression guard):
//   [1.5-E2E-006] Logout button NOT visible on /login page (no header without session)
//
// Note: AC2/AC3 tests (003–005) perform fresh login before each test to avoid
//       session ID conflicts after logout (storageState session row is deleted server-side).

import { test, expect, type Page } from '@playwright/test'
import { waitForHydration } from './helpers/waitForHydration'
import { TEST_USERS } from './global-setup'

const RETURNING_STATE = '.auth/returning.json'

// ---------------------------------------------------------------------------
// Helper: fresh login as returning user (used for logout flow tests)
// ---------------------------------------------------------------------------

async function loginAsReturning(page: Page): Promise<void> {
  await page.goto('/login')
  await waitForHydration(page)
  await page.getByTestId('login-username-input').fill(TEST_USERS.returning.username)
  await page.getByTestId('login-password-input').fill(TEST_USERS.returning.password)
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/_serverFn') && res.request().method() === 'POST',
      { timeout: 10000 },
    ),
    page.getByTestId('login-submit-button').click(),
  ])
  await page.waitForURL('/', { timeout: 15000 })
}

test.describe('[Story 1.5] Player Logout — E2E (ATDD)', () => {
  // ---------------------------------------------------------------------------
  // AC1 — Logout button visible on authenticated pages (read-only — uses storageState)
  // ---------------------------------------------------------------------------

  test.describe('AC1: logout button visibility', () => {
    test.use({ storageState: RETURNING_STATE })

    test('[1.5-E2E-001][P0][AC1] authenticated user sees "Se déconnecter" button on main page', async ({
      page,
    }) => {
      await page.goto('/')
      await waitForHydration(page)

      // AppHeader must be visible with logout button
      await expect(page.getByTestId('logout-button')).toBeVisible()
      await expect(page.getByTestId('logout-button')).toHaveText('Se déconnecter')
    })

    test('[1.5-E2E-002][P1][AC1] identity indicator (displayName) visible in header', async ({
      page,
    }) => {
      await page.goto('/')
      await waitForHydration(page)

      // Display name shown in top-left of AppHeader
      await expect(page.getByText(TEST_USERS.returning.displayName)).toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // AC2/AC3 — Logout flow: session cleared, redirect to /login, back button protection
  // Each test performs a fresh login to avoid session conflicts after logout.
  // ---------------------------------------------------------------------------

  test.describe('AC2/AC3: logout flow', () => {
    test('[1.5-E2E-003][P0][AC2] clicking "Se déconnecter" redirects to /login', async ({
      page,
    }) => {
      await loginAsReturning(page)
      await waitForHydration(page)

      // Logout button must be visible after login
      await expect(page.getByTestId('logout-button')).toBeVisible()

      await page.getByTestId('logout-button').click()

      // Must redirect to /login after logout (cookie cleared + DB row deleted)
      await page.waitForURL('/login', { timeout: 10000 })
      await expect(page).toHaveURL('/login')
    })

    test('[1.5-E2E-004][P0][AC2] after logout, navigating to / redirects to /login (session cleared)', async ({
      page,
    }) => {
      await loginAsReturning(page)
      await waitForHydration(page)

      await page.getByTestId('logout-button').click()
      await page.waitForURL('/login', { timeout: 10000 })

      // Try to navigate to protected route — beforeLoad must reject
      await page.goto('/')
      await expect(page).toHaveURL('/login')
    })

    test('[1.5-E2E-005][P0][AC3] after logout, browser back button stays on /login', async ({
      page,
    }) => {
      await loginAsReturning(page)
      await waitForHydration(page)

      await page.getByTestId('logout-button').click()
      await page.waitForURL('/login', { timeout: 10000 })

      // Browser back — history entry for / exists, but session is gone
      // beforeLoad must intercept and redirect back to /login
      await page.goBack()
      await expect(page).toHaveURL('/login')
    })
  })

  // ---------------------------------------------------------------------------
  // AC1 guardrail — Logout button NOT visible on /login (no header without session)
  // ---------------------------------------------------------------------------

  test.describe('AC1 guardrail: no header on unauthenticated pages', () => {
    test('[1.5-E2E-006][P1][AC1] logout button NOT visible on /login page', async ({
      page,
    }) => {
      await page.goto('/login')
      await waitForHydration(page)

      // No AppHeader on /login — session guard (session &&) prevents rendering
      await expect(page.getByTestId('logout-button')).not.toBeVisible()
    })
  })
})
