// Campaign TOW — Admin account seed
// Idempotent: does nothing if admin account already exists.
// Requires ADMIN_PASSWORD_HASH env var (bcryptjs hash, 12 rounds).

import { eq } from 'drizzle-orm'
import { db } from './index'
import { players } from './schema'

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin'
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH

if (!ADMIN_PASSWORD_HASH) {
  throw new Error('[seed-admin] ADMIN_PASSWORD_HASH environment variable is required')
}

async function seedAdmin() {
  const existing = await db.query.players.findFirst({
    where: eq(players.username, ADMIN_USERNAME),
  })

  if (existing) {
    console.log(`[seed-admin] Admin account "${ADMIN_USERNAME}" already exists — skipping`)
    process.exit(0)
  }                                                                                                          

  await db.insert(players).values({
    username: ADMIN_USERNAME,
    passwordHash: ADMIN_PASSWORD_HASH!,
    displayName: ADMIN_USERNAME,
    isAdmin: true,
    hasSeenWelcome: false,
  })

  console.log(`[seed-admin] Admin account "${ADMIN_USERNAME}" created successfully`)
  process.exit(0)
}

seedAdmin().catch((err) => {
  console.error('[seed-admin] Failed:', err)
  process.exit(1)
})
