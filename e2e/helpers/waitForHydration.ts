import type { Page } from '@playwright/test'

export async function waitForHydration(
  page: Page,
  selector = 'html[data-app-hydrated="true"]',
) {
  await page.waitForSelector(selector, { timeout: 15000 })
}