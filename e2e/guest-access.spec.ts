// e2e/guest-access.spec.ts
// Story 1.7: Guest Access (Read-Only)
//
// Pre-conditions (handled by global-setup.ts):
//   - Ghost player (__guest__) exists with isGuest = true, auth saved to .auth/guest.json
//   - Admin user (e2e_admin) exists with isAdmin = true, auth saved to .auth/admin.json
//   - Non-admin user (e2e_returning) exists, auth saved to .auth/returning.json
//
// Note: No test.skip() — project pattern is for tests to fail naturally (TDD RED phase).

import { test, expect } from '@playwright/test'
import { waitForHydration } from './helpers/waitForHydration'

const GUEST_STATE = '.auth/guest.json'

test.describe('[Story 1.7] Guest Access (Read-Only) — E2E (ATDD)', () => {
  // ---------------------------------------------------------------------------
  // AC1 — Guest link visible on login page (unauthenticated)
  // ---------------------------------------------------------------------------

  test.describe('AC1: guest link on login page', () => {
    // No storageState — unauthenticated visit to /login

    test('[1.7-E2E-001][P0][AC1] guest link "Continuer en tant qu\'invité" is visible below the login form', async ({
      page,
    }) => {
      await page.goto('/login')
      await waitForHydration(page)

      // Guest link must be visible — blue text link below the login form
      const guestLink = page.getByTestId('guest-login-link')
      await expect(guestLink).toBeVisible()
      await expect(guestLink).toContainText(/continuer en tant qu'invité/i)
    })
  })

  // ---------------------------------------------------------------------------
  // AC2 — Click guest link → guest session created → redirected to / with "Invité" indicator
  // ---------------------------------------------------------------------------

  test.describe('AC2: guest session creation via guest link', () => {
    // No storageState — tests the full guest login flow

    test("[1.7-E2E-002][P0][AC2] click guest link → guest session created → redirected to / → identity indicator shows 'Invité'", async ({
      page,
    }) => {
      await page.goto('/login')
      await waitForHydration(page)

      // Click the guest link — triggers guestLoginFn POST to /_serverFn
      await Promise.all([
        page.waitForResponse(
          (res) => res.url().includes('/_serverFn') && res.request().method() === 'POST',
          { timeout: 10000 },
        ),
        page.getByTestId('guest-login-link').click(),
      ])

      // Must redirect to Campaign view (/)
      await page.waitForURL(/\/$/, { timeout: 15000 })
      await waitForHydration(page)

      // Identity indicator must show "Invité" (not displayName, not "Admin")
      await expect(page.getByText('Invité')).toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // AC3 — Guest can navigate the app (Campaign view accessible, all tabs visible)
  // ---------------------------------------------------------------------------

  test.describe('AC3: guest read access', () => {
    test.use({ storageState: GUEST_STATE })

    test('[1.7-E2E-003][P1][AC3] guest can access Campaign view without being redirected to /login', async ({
      page,
    }) => {
      await page.goto('/')
      await waitForHydration(page)

      // Guest must NOT be redirected to /login — must remain on /
      await expect(page).toHaveURL(/\/$/)

      // Campaign view heading must be visible (not a redirect or error page)
      await expect(page.getByRole('main')).toBeVisible()

      // All three tabs must be visible in the tab bar for guests
      await expect(page.getByText(/campagne/i)).toBeVisible()
      await expect(page.getByText(/armées/i)).toBeVisible()
      await expect(page.getByText(/territoires/i)).toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // AC5 — Identity indicator shows "Invité" for guest (via storageState)
  // ---------------------------------------------------------------------------

  test.describe('AC5: identity indicator for guest', () => {
    test.use({ storageState: GUEST_STATE })

    test("[1.7-E2E-004][P0][AC5] identity indicator shows 'Invité' for guest session (top-left of AppHeader)", async ({
      page,
    }) => {
      await page.goto('/')
      await waitForHydration(page)

      // Identity indicator must show "Invité" — not displayName, not "Admin"
      await expect(page.getByText('Invité')).toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // AC6 — Guest sees "Se connecter" not "Se déconnecter" in AppHeader
  // ---------------------------------------------------------------------------

  test.describe('AC6: guest session menu — Se connecter', () => {
    test.use({ storageState: GUEST_STATE })

    test("[1.7-E2E-005][P0][AC6] guest AppHeader shows 'Se connecter' button (not 'Se déconnecter')", async ({
      page,
    }) => {
      await page.goto('/')
      await waitForHydration(page)

      // "Se connecter" button must be visible for guest
      await expect(page.getByTestId('login-button')).toBeVisible()
      await expect(page.getByTestId('login-button')).toContainText(/se connecter/i)

      // "Se déconnecter" button must NOT be present in DOM for guest
      await expect(page.getByTestId('logout-button')).toHaveCount(0)
    })

    test('[1.7-E2E-006][P0][AC6] "Administration" link is absent from DOM for guest (not just hidden)', async ({
      page,
    }) => {
      await page.goto('/')
      await waitForHydration(page)

      // "Administration" link must be absent from DOM entirely — not visible, not hidden via CSS
      await expect(page.getByTestId('admin-link')).toHaveCount(0)
    })
  })

  // ---------------------------------------------------------------------------
  // AC7 — "Se connecter" click clears guest session → redirected to /login
  // ---------------------------------------------------------------------------

  test.describe('AC7: Se connecter clears guest session', () => {
    test.use({ storageState: GUEST_STATE })

    test('[1.7-E2E-007][P0][AC7] clicking "Se connecter" as guest clears session and redirects to /login', async ({
      page,
    }) => {
      await page.goto('/')
      await waitForHydration(page)

      // Click "Se connecter" — triggers logout (clears session) → redirect to /login
      await page.getByTestId('login-button').click()

      // Must redirect to /login after session is cleared
      await page.waitForURL(/\/login$/, { timeout: 15000 })
      await waitForHydration(page)

      // Login page must be visible — no longer authenticated as guest
      await expect(page.getByTestId('login-submit-button')).toBeVisible()
    })
  })
})
