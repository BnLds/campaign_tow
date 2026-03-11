// Campaign TOW — Reset hasSeenWelcome flag (local dev only)
// Usage: pnpm tsx src/db/reset-welcome.ts [username]
// Default username: admin (or ADMIN_USERNAME env var)

import { eq } from 'drizzle-orm'
import { db } from './index'
import { players } from './schema'

const username = (process.argv[2] as string | undefined) ?? process.env.ADMIN_USERNAME ?? 'admin'

async function resetWelcome() {
  const result = await db
    .update(players)
    .set({ hasSeenWelcome: false })
    .where(eq(players.username, username))
    .returning({ username: players.username, displayName: players.displayName })

  if (result.length === 0) {
    console.error(`[reset-welcome] Player "${username}" not found`)
    process.exit(1)
  }

  const { displayName } = result[0]
  console.log(`[reset-welcome] "${displayName}" (${username}) → hasSeenWelcome = false`)
  process.exit(0)
}

resetWelcome().catch((err) => {
  console.error('[reset-welcome] Failed:', err)
  process.exit(1)
})
