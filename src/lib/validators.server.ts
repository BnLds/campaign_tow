// Campaign TOW — Server-only validators (drizzle-zod dependent)
// Do NOT import this file from client components.

import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'
import { players } from '../db/schema'

// Player creation schema — for story 1.4 (admin creates accounts)
export const insertPlayerSchema = createInsertSchema(players, {
  username: z.string().min(2, 'Username must be at least 2 characters').max(50),
  displayName: z.string().min(1, 'Display name is required').max(100),
}).pick({ username: true, displayName: true, isAdmin: true })
