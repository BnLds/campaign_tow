// Campaign TOW — Reset all data except admin and guest player profiles
// Usage: pnpm db:reset-data
// Keeps players where isAdmin=true or isGuest=true, deletes everything else.

import { sql } from 'drizzle-orm'
import { db } from './index'

async function resetData() {
  console.log('[reset-data] Starting database reset (keeping admin & guest profiles)...')

  await db.transaction(async (tx) => {
    // Delete in FK-safe order (children first)
    const deleted = {
      matchXpEntries: (await tx.execute(sql`DELETE FROM match_xp_entries`)).rowCount,
      statModifiers: (await tx.execute(sql`DELETE FROM stat_modifiers`)).rowCount,
      unitGains: (await tx.execute(sql`DELETE FROM unit_gains`)).rowCount,
      matchParticipants: (await tx.execute(sql`DELETE FROM match_participants`)).rowCount,
      matches: (await tx.execute(sql`DELETE FROM matches`)).rowCount,
      subProfiles: (await tx.execute(sql`DELETE FROM sub_profiles`)).rowCount,
      units: (await tx.execute(sql`DELETE FROM units`)).rowCount,
      armies: (await tx.execute(sql`DELETE FROM armies`)).rowCount,
      sessions: (await tx.execute(sql`DELETE FROM sessions`)).rowCount,
      players: (
        await tx.execute(
          sql`DELETE FROM players WHERE is_admin = false AND is_guest = false`
        )
      ).rowCount,
    }

    console.log('[reset-data] Deleted rows:')
    for (const [table, count] of Object.entries(deleted)) {
      console.log(`  ${table}: ${count}`)
    }
  })

  // Show remaining players
  const remaining = await db.execute(
    sql`SELECT username, display_name, is_admin, is_guest FROM players ORDER BY username`
  )
  console.log(`[reset-data] Remaining players (${remaining.rowCount}):`)
  for (const row of remaining.rows) {
    const roles = [row.is_admin && 'admin', row.is_guest && 'guest'].filter(Boolean).join(', ')
    console.log(`  ${row.display_name} (${row.username}) [${roles}]`)
  }

  console.log('[reset-data] Done.')
  process.exit(0)
}

resetData().catch((err) => {
  console.error('[reset-data] Failed:', err)
  process.exit(1)
})
