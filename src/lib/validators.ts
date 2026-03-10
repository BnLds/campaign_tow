// Campaign TOW — Validators (client-safe, pure Zod)
// Server-only schemas (drizzle-zod dependent) live in validators.server.ts

import { z } from 'zod'

// Login form schema — used in loginFn and TanStack Form (AC2, AC3)
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginInput = z.infer<typeof loginSchema>

// Display name update schema — for WelcomeModal and profile settings (story 1.3)
export const updateDisplayNameSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required').max(100, 'Display name must be 100 characters or less'),
})
export type UpdateDisplayNameInput = z.infer<typeof updateDisplayNameSchema>
