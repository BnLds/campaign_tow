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
  type: z.string().min(1, 'Le type est requis').trim(),
  armyId: z.string().min(1, "L'armée est requise"),
  m: z.string().max(20).default(''),
  cc: z.string().max(20).default(''),
  ct: z.string().max(20).default(''),
  f: z.string().max(20).default(''),
  e: z.string().max(20).default(''),
  pv: z.string().max(20).default(''),
  i: z.string().max(20).default(''),
  a: z.string().max(20).default(''),
  cd: z.string().max(20).default(''),
})
export type AddUnitInput = z.infer<typeof addUnitSchema>

// Story 3.1 — Admin: manual match creation
export const createMatchSchema = z.object({
  army1Id: z.string().min(1, "L'armée 1 est requise"),
  result1: z.enum(['victory', 'defeat', 'draw']).nullable(),
  army2Id: z.string().min(1, "L'armée 2 est requise"),
  result2: z.enum(['victory', 'defeat', 'draw']).nullable(),
  date: z.string().min(1, 'La date est requise'),
  evolutionsEntered: z.boolean(),
})
export type CreateMatchInput = z.infer<typeof createMatchSchema>

// Story 3.3 — Match result entry
export const submitMatchResultSchema = z.object({
  matchId: z.string().min(1),
  result: z.enum(['victory', 'defeat', 'draw']),
})
export type SubmitMatchResultInput = z.infer<typeof submitMatchResultSchema>

// Shared result validation helper
const VALID_RESULTS = new Set(['victory', 'defeat', 'draw'] as const)
export type ValidResult = 'victory' | 'defeat' | 'draw'
export function toValidResult(r: string | null): ValidResult | null {
  if (r && VALID_RESULTS.has(r as ValidResult)) return r as ValidResult
  return null
}

// Story 4.1 — Post-match flow: XP entry and evolution completion
export const loadPostMatchDataSchema = z.object({
  matchId: z.string().min(1),
})
export type LoadPostMatchDataInput = z.infer<typeof loadPostMatchDataSchema>

export const submitUnitXpSchema = z.object({
  matchParticipantId: z.string().min(1),
  unitId: z.string().min(1),
  xpGained: z.number().int().min(0).max(99),
})
export type SubmitUnitXpInput = z.infer<typeof submitUnitXpSchema>

export const completeEvolutionsSchema = z.object({
  matchId: z.string().min(1),
})
export type CompleteEvolutionsInput = z.infer<typeof completeEvolutionsSchema>

// Story 4.2 — Tier-up: save selected improvements as unit_gains
export const submitTierUpSchema = z.object({
  unitId: z.string().min(1),
  matchParticipantId: z.string().min(1),
  improvements: z.array(z.object({ description: z.string().min(1) })).min(1),
})
export type SubmitTierUpInput = z.infer<typeof submitTierUpSchema>

// Story 4.3 — Consequence type enum (shared by InjuryResult and DestructionResult)
const consequenceTypeEnum = z.enum([
  'death',
  'permanent_injury',
  'grave_injury',
  'no_effect',
  'haine',
  'miracule',
  'deroute_sanglante',
  'pertes_catastrophiques',
  'moral_brise',
  'survivants_endurcis',
  'rancune',
  'fureur_vengeresse',
])

// Batch commit: complete evolutions with all tier-up gains in one atomic operation
export const completeEvolutionsWithGainsSchema = z.object({
  matchId: z.string().min(1),
  matchParticipantId: z.string().min(1),
  gains: z.array(z.object({
    unitId: z.string().min(1),
    descriptions: z.array(z.string().min(1)),
  })),
  // Story 4.3: optional consequences array (injuries + destruction results)
  // armyId is NOT in schema — derived server-side from authenticated player's army
  consequences: z.array(z.object({
    unitId: z.string().min(1),
    type: consequenceTypeEnum,
    stat: z.string().optional(),
    delta: z.number().optional(),
    bannerLost: z.boolean().optional(),
    // opponentPlayerName: passed by wizard for Haine / Rancune descriptions
    opponentPlayerName: z.string().optional(),
    // xpLostAmount: passed for deroute_sanglante to record in unit_gain description
    xpLostAmount: z.number().optional(),
  })).optional(),
  // championKilledIds: unit IDs where champion was killed in challenge (Phase 1 checkbox)
  championKilledIds: z.array(z.string().min(1)).optional(),
})
export type CompleteEvolutionsWithGainsInput = z.infer<typeof completeEvolutionsWithGainsSchema>
export type ConsequenceEntry = NonNullable<CompleteEvolutionsWithGainsInput['consequences']>[number]

export const updateSubProfileSchema = z.object({
  subProfileId: z.string().min(1, 'Le sous-profil est requis'),
  m: z.string().max(20).default(''),
  cc: z.string().max(20).default(''),
  ct: z.string().max(20).default(''),
  f: z.string().max(20).default(''),
  e: z.string().max(20).default(''),
  pv: z.string().max(20).default(''),
  i: z.string().max(20).default(''),
  a: z.string().max(20).default(''),
  cd: z.string().max(20).default(''),
})
export type UpdateSubProfileInput = z.infer<typeof updateSubProfileSchema>
