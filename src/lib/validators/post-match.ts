// Campaign TOW — Post-match validators (client-safe, pure Zod)

import { z } from 'zod'

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
export const consequenceTypeEnum = z.enum([
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

const consequenceEntryBase = z.object({
  unitId: z.string().min(1),
  type: consequenceTypeEnum,
  stat: z.string().optional(),
  delta: z.number().optional(),
  bannerLost: z.boolean().optional(),
  // opponentPlayerName: passed by wizard for Haine / Rancune descriptions
  opponentPlayerName: z.string().optional(),
  // xpLostAmount: passed for deroute_sanglante to record in unit_gain description
  xpLostAmount: z.number().optional(),
})

function validateConsequenceEntry(
  entry: z.output<typeof consequenceEntryBase>,
  ctx: z.RefinementCtx
): void {
  const requiresStatDelta: Array<typeof entry.type> = ['permanent_injury', 'grave_injury']
  const forbidsStatDelta: Array<typeof entry.type> = ['death', 'no_effect', 'miracule', 'haine', 'rancune', 'fureur_vengeresse', 'survivants_endurcis']
  if (requiresStatDelta.includes(entry.type)) {
    if (!entry.stat || entry.stat.trim() === '') {
      ctx.addIssue({ code: 'custom', message: 'Le champ stat est requis pour ce type de conséquence', path: ['stat'] })
    }
    if (entry.delta === undefined) {
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
    if (entry.xpLostAmount === undefined || entry.xpLostAmount <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Le champ xpLostAmount (> 0) est requis pour deroute_sanglante', path: ['xpLostAmount'] })
    }
  }
}

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
  consequences: z.array(consequenceEntryBase.superRefine(validateConsequenceEntry)).optional(),
  // championKilledIds: unit IDs where champion was killed in challenge (Phase 1 checkbox)
  championKilledIds: z.array(z.string().min(1)).optional(),
})
export type CompleteEvolutionsWithGainsInput = z.infer<typeof completeEvolutionsWithGainsSchema>
export type ConsequenceEntry = NonNullable<CompleteEvolutionsWithGainsInput['consequences']>[number]
