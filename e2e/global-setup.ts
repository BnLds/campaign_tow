// E2E global setup — runs once before all Playwright tests.
// Creates two test players (idempotent) and saves their auth cookies.
//
// Test users:
//   e2e_first_login  — hasSeenWelcome: false  → used for AC1/AC2/AC3/AC4 tests
//   e2e_returning    — hasSeenWelcome: true   → used for AC5 test
//
// Key learnings:
//   - Use waitForFunction with React fiber check instead of waitForLoadState('networkidle')
//     because Vite dev server keeps a HMR WebSocket open, causing networkidle to timeout.
//   - Use Promise.all([waitForResponse, click()]) to capture the loginFn server function
//     response and confirm the POST to /_serverFn was made.

import type { FullConfig } from '@playwright/test'
import { chromium } from '@playwright/test'
import { hash } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import * as schema from '../src/db/schema.ts'
import { closeTestDb, getTestDb } from './helpers/db.ts'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

export const TEST_USERS = {
  firstLogin: {
    username: 'e2e_first_login',
    password: 'E2eTestPwd1!',
    displayName: 'E2E Premier Joueur',
    hasSeenWelcome: false as const,
  },
  returning: {
    username: 'e2e_returning',
    password: 'E2eTestPwd1!',
    displayName: 'E2E Joueur Existant',
    hasSeenWelcome: true as const,
  },
} as const

async function upsertTestUser(
  username: string,
  passwordHash: string,
  displayName: string,
  hasSeenWelcome: boolean,
): Promise<void> {
  const db = getTestDb()
  const existing = await db.query.players.findFirst({
    where: eq(schema.players.username, username),
  })

  if (existing) {
    await db
      .update(schema.players)
      .set({ hasSeenWelcome, displayName })
      .where(eq(schema.players.username, username))
  } else {
    await db.insert(schema.players).values({
      username,
      passwordHash,
      displayName,
      hasSeenWelcome,
      isAdmin: false,
    })
  }
}

async function saveAuthState(
  username: string,
  password: string,
  filePath: string,
): Promise<void> {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(`${BASE_URL}/login`)

  // Wait for React hydration — networkidle fails on Vite dev server (HMR WebSocket).
  // Check for React fiber internals on the submit button: only present after hydration.
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[data-testid="login-submit-button"]')
      if (!btn) return false
      return Object.keys(btn).some(
        (k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternals'),
      )
    },
    undefined,
    { timeout: 15000 },
  )

  await page.getByTestId('login-username-input').fill(username)
  await page.getByTestId('login-password-input').fill(password)

  // Click submit and wait for the loginFn POST response simultaneously.
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/_serverFn') && res.request().method() === 'POST',
      { timeout: 10000 },
    ),
    page.getByTestId('login-submit-button').click(),
  ])

  // Wait for redirect to / after successful login.
  // If login fails, the error message will appear — catch it for a clearer error.
  try {
    await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 })
  } catch {
    await page.screenshot({ path: `.auth/debug-login-${username}.png` })
    const url = page.url()
    const errorEl = page.getByTestId('login-error-message')
    const visible = await errorEl.isVisible().catch(() => false)
    const errorText = visible ? await errorEl.textContent() : '(no error message visible)'
    throw new Error(
      `[E2E global-setup] Login failed for "${username}". URL: ${url}. Error: ${errorText}`,
    )
  }

  await context.storageState({ path: filePath })
  await browser.close()
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  fs.mkdirSync('.auth', { recursive: true })

  // Use fewer bcrypt rounds for test speed (security not required here)
  const firstLoginHash = await hash(TEST_USERS.firstLogin.password, 10)
  const returningHash = await hash(TEST_USERS.returning.password, 10)

  await upsertTestUser(
    TEST_USERS.firstLogin.username,
    firstLoginHash,
    TEST_USERS.firstLogin.displayName,
    TEST_USERS.firstLogin.hasSeenWelcome,
  )
  await upsertTestUser(
    TEST_USERS.returning.username,
    returningHash,
    TEST_USERS.returning.displayName,
    TEST_USERS.returning.hasSeenWelcome,
  )

  await closeTestDb()

  await saveAuthState(
    TEST_USERS.firstLogin.username,
    TEST_USERS.firstLogin.password,
    '.auth/first-login.json',
  )
  await saveAuthState(
    TEST_USERS.returning.username,
    TEST_USERS.returning.password,
    '.auth/returning.json',
  )

  console.log('[E2E] Global setup: test users ready, auth states saved')
}