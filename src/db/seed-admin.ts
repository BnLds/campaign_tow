// Campaign TOW — Admin account seed
// Idempotent: does nothing if admin account already exists.
// Requires ADMIN_PASSWORD_HASH env var (bcryptjs hash, 12 rounds).

import { eq } from 'drizzle-orm'
import { db } from './index'
import { players } from './schema'

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin'

async function seedAdmin() {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH
  if (!passwordHash) {
    throw new Error('[seed-admin] ADMIN_PASSWORD_HASH environment variable is required')
  }

  const existing = await db.query.players.findFirst({
    where: eq(players.username, ADMIN_USERNAME),
  })

  if (existing) {
    console.log(`[seed-admin] Admin account "${ADMIN_USERNAME}" already exists — skipping`)
    process.exit(0)
  }

  await db.insert(players).values({
    username: ADMIN_USERNAME,
    passwordHash,
    isAdmin: true,
  })

  console.log(`[seed-admin] Admin account "${ADMIN_USERNAME}" created successfully`)
  process.exit(0)
}

seedAdmin().catch((err) => {
  console.error('[seed-admin] Failed:', err)
  process.exit(1)
})
