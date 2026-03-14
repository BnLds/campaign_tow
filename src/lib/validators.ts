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

// Story 2.1 — Army import & player assignment
export const importArmySchema = z.object({
  rawText: z.string().trim().min(1),
})
export type ImportArmyInput = z.infer<typeof importArmySchema>

export const assignArmySchema = z.object({
  armyId: z.string().min(1),
  playerId: z.string().min(1),
})
export type AssignArmyInput = z.infer<typeof assignArmySchema>

// Story 2.2 — Manual unit entry & post-import correction

export const addUnitSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis').max(200, 'Le nom ne peut pas dépasser 200 caractères'),
  type: z.string().min(1, 'Le type est requis'),
  armyId: z.string().min(1, "L'armée est requise"),
  m: z.string().max(20),
  cc: z.string().max(20),
  ct: z.string().max(20),
  f: z.string().max(20),
  e: z.string().max(20),
  pv: z.string().max(20),
  i: z.string().max(20),
  a: z.string().max(20),
  cd: z.string().max(20),
})
export type AddUnitInput = z.infer<typeof addUnitSchema>

export const updateSubProfileSchema = z.object({
  subProfileId: z.string().min(1, 'Le sous-profil est requis'),
  m: z.string().max(20),
  cc: z.string().max(20),
  ct: z.string().max(20),
  f: z.string().max(20),
  e: z.string().max(20),
  pv: z.string().max(20),
  i: z.string().max(20),
  a: z.string().max(20),
  cd: z.string().max(20),
})
export type UpdateSubProfileInput = z.infer<typeof updateSubProfileSchema>
