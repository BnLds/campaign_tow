// E2E DB helper — standalone connection for test setup/teardown.
// Does NOT import src/db/index.ts to avoid side effects (pool health check + env guard).
// Uses src/db/schema.ts directly (pure Drizzle definitions, Node.js safe).

import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { Pool } from 'pg'
import * as schema from '../../src/db/schema.ts'

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('[E2E DB] DATABASE_URL not set — is .env.local loaded?')
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}

export function getTestDb() {
  return drizzle(getPool(), { schema })
}

export async function closeTestDb(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

// Resets the first-login test user to hasSeenWelcome=false + original display name.
// Must be called in beforeEach for tests that require the welcome modal to appear.
export async function resetFirstLoginUser(): Promise<void> {
  const db = getTestDb()
  await db
    .update(schema.players)
    .set({ hasSeenWelcome: false, displayName: 'E2E Premier Joueur' })
    .where(eq(schema.players.username, 'e2e_first_login'))
}