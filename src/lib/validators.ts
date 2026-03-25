// Campaign TOW — Validators (client-safe, pure Zod)

import { z } from 'zod'

// Shared username field — single source of truth for username constraints
const RESERVED_USERNAMES = new Set(['__guest__', 'admin', 'system'])
const usernameField = z.string().trim().min(2, 'Le nom doit faire au moins 2 caracteres').max(50, 'Le nom ne peut pas depasser 50 caracteres').refine((v) => !RESERVED_USERNAMES.has(v.toLowerCase()), "Ce nom d'utilisateur est réservé")

// Login form schema — used in loginFn and TanStack Form (AC2, AC3)
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginInput = z.infer<typeof loginSchema>

// Username update schema — for profile settings and invite setup
export const updateUsernameSchema = z.object({ username: usernameField })
export type UpdateUsernameInput = z.infer<typeof updateUsernameSchema>

// Admin — Create player account (invite link flow)
export const createPlayerSchema = z.object({ username: usernameField })
export type CreatePlayerInput = z.infer<typeof createPlayerSchema>

// Invite form schema — single merged schema for TanStack Form (username + password fields)
export const inviteFormSchema = z.object({
  username: usernameField,
  password: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères').max(100),
  confirmPassword: z.string().min(6).max(100),
}).superRefine((d, ctx) => {
  if (d.password !== d.confirmPassword) {
    ctx.addIssue({
      code: 'custom',
      message: 'Les mots de passe ne correspondent pas',
      path: ['confirmPassword'],
    })
  }
})
export type InviteFormInput = z.infer<typeof inviteFormSchema>

// Password change — settings page
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(100).optional(),
  newPassword: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères').max(100),
  confirmNewPassword: z.string().min(6).max(100),
}).superRefine((d, ctx) => {
  if (d.newPassword !== d.confirmNewPassword) {
    ctx.addIssue({
      code: 'custom',
      message: 'Les mots de passe ne correspondent pas',
      path: ['confirmNewPassword'],
    })
  }
})
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Format d'heure invalide (HH:MM)"),
  evolutionsEntered: z.boolean(),
}).superRefine((d, ctx) => {
  const r1 = d.result1
  const r2 = d.result2
  if ((r1 === null) !== (r2 === null)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Les deux résultats doivent être renseignés ou tous les deux absents',
      path: ['result2'],
    })
    return
  }
  if (r1 !== null && r2 !== null) {
    if (r1 === 'victory' && r2 !== 'defeat') {
      ctx.addIssue({ code: 'custom', message: 'Une victoire implique une défaite pour l\'adversaire', path: ['result2'] })
    } else if (r1 === 'defeat' && r2 !== 'victory') {
      ctx.addIssue({ code: 'custom', message: 'Une défaite implique une victoire pour l\'adversaire', path: ['result2'] })
    } else if (r1 === 'draw' && r2 !== 'draw') {
      ctx.addIssue({ code: 'custom', message: 'Un match nul doit être nul pour les deux armées', path: ['result2'] })
    }
  }
})
export type CreateMatchInput = z.infer<typeof createMatchSchema>

// Story 3.3 — Match result entry
export const submitMatchResultSchema = z.object({
  matchId: z.string().min(1),
  result: z.enum(['victory', 'defeat', 'draw']),
})
export type SubmitMatchResultInput = z.infer<typeof submitMatchResultSchema>

// Delete pending match
export const deleteMatchSchema = z.object({
  matchId: z.string().min(1),
})
export type DeleteMatchInput = z.infer<typeof deleteMatchSchema>

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

// Initial XP entry — same as submitUnitXpSchema but allows 0-999, plus optional derouteXpLost
export const submitInitialXpSchema = z.object({
  matchParticipantId: z.string().min(1),
  unitId: z.string().min(1),
  xpGained: z.number().int().min(0).max(200),
  derouteXpLost: z.number().int().nonnegative().default(0),
  bonusXp: z.number().int().nonnegative().optional(),
})
export type SubmitInitialXpInput = z.infer<typeof submitInitialXpSchema>

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
    descriptions: z.array(z.string().min(1)).max(10),
    thresholdXp: z.number().int().nullable().optional(),
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
  }).superRefine((entry, ctx) => {
    const requiresStatDelta: Array<typeof entry.type> = ['permanent_injury', 'grave_injury']
    const forbidsStatDelta: Array<typeof entry.type> = ['death', 'no_effect', 'miracule', 'haine', 'rancune', 'fureur_vengeresse', 'survivants_endurcis']
    if (requiresStatDelta.includes(entry.type)) {
      if (!entry.stat || entry.stat.trim() === '') {
        ctx.addIssue({ code: 'custom', message: 'Le champ stat est requis pour ce type de conséquence', path: ['stat'] })
      }
      if (entry.delta === undefined || entry.delta === null) {
        ctx.addIssue({ code: 'custom', message: 'Le champ delta est requis pour ce type de conséquence', path: ['delta'] })
      }
    }
    if (forbidsStatDelta.includes(entry.type)) {
      if (entry.stat !== undefined) {
        ctx.addIssue({ code: 'custom', message: 'Le champ stat ne doit pas être présent pour ce type de conséquence', path: ['stat'] })
      }
      if (entry.delta !== undefined) {
        ctx.addIssue({ code: 'custom', message: 'Le champ delta ne doit pas être présent pour ce type de conséquence', path: ['delta'] })
      }
    }
    if (entry.type === 'deroute_sanglante') {
      if (entry.xpLostAmount === undefined || entry.xpLostAmount === null || entry.xpLostAmount <= 0) {
        ctx.addIssue({ code: 'custom', message: 'Le champ xpLostAmount (> 0) est requis pour deroute_sanglante', path: ['xpLostAmount'] })
      }
    }
  })).optional(),
  // championKilledIds: unit IDs where champion was killed in challenge (Phase 1 checkbox)
  championKilledIds: z.array(z.string().min(1)).optional(),
})
export type CompleteEvolutionsWithGainsInput = z.infer<typeof completeEvolutionsWithGainsSchema>
export type ConsequenceEntry = NonNullable<CompleteEvolutionsWithGainsInput['consequences']>[number]

// Incremental unit import — structured data schema
// Source of truth for field shapes: ParsedUnit / ParsedSubProfile in owb-parser.ts
const addUnitsSubProfileSchema = z.object({
  label: z.string().max(100),
  isMount: z.boolean(),
  m: z.string().max(10).nullable(),
  cc: z.string().max(10).nullable(),
  ct: z.string().max(10).nullable(),
  f: z.string().max(10).nullable(),
  e: z.string().max(10).nullable(),
  pv: z.string().max(10).nullable(),
  i: z.string().max(10).nullable(),
  a: z.string().max(10).nullable(),
  cd: z.string().max(10).nullable(),
})

const addUnitsUnitSchema = z.object({
  name: z.string().max(200),
  nickname: z.string().max(80).nullable().optional(),
  type: z.string().max(100),
  points: z.number().int().min(0).max(9999),
  modelCount: z.number().int().min(1).max(999).nullable(),
  specialRules: z.string().max(2000).nullable(),
  options: z.string().max(2000).nullable(),
  subProfiles: z.array(addUnitsSubProfileSchema).max(20),
})

export const addUnitsToArmySchema = z.object({
  armyId: z.string().min(1),
  units: z.array(addUnitsUnitSchema).min(1).max(100),
})
export type AddUnitsToArmyInput = z.infer<typeof addUnitsToArmySchema>

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
