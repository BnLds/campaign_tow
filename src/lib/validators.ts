// Campaign TOW — Validators (client-safe, pure Zod)

import { z } from 'zod'

// Login form schema — used in loginFn and TanStack Form (AC2, AC3)
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginInput = z.infer<typeof loginSchema>

// Display name update schema — for WelcomeModal and profile settings (story 1.3)
export const updateDisplayNameSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required').max(100, 'Display name must be 100 characters or less'),
})
export type UpdateDisplayNameInput = z.infer<typeof updateDisplayNameSchema>

// Admin — Create player account (story 1.4)
export const createPlayerSchema = z.object({
  username: z.string().trim().min(2, 'Username must be at least 2 characters').max(50, 'Username must be 50 characters or less'),
  tempPassword: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password must be 100 characters or less'),
})
export type CreatePlayerInput = z.infer<typeof createPlayerSchema>
