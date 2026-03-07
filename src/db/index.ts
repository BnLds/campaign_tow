import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema.ts'

if (!process.env.DATABASE_URL) {
  throw new Error('[DB] DATABASE_URL environment variable is required')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool, { schema })

// Startup health check — logs warning if DB is unreachable at deploy time
pool.query('SELECT 1').catch((err: Error) => {
  console.error('[DB] Connection health check failed:', err.message)
  // Do NOT throw — app should still start, Railway will show the log
})
