// Campaign TOW — Validators
// Zod schemas for input validation, derived from Drizzle schema where possible.

import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'
import { players } from '../db/schema'

// Login form schema — used in loginFn and TanStack Form (AC2, AC3)
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginInput = z.infer<typeof loginSchema>

// Player creation schema — for story 1.4 (admin creates accounts)
export const insertPlayerSchema = createInsertSchema(players, {
  username: z.string().min(2, 'Username must be at least 2 characters').max(50),
  displayName: z.string().min(1, 'Display name is required').max(100),
}).pick({ username: true, displayName: true, isAdmin: true })
