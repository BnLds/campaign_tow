// Campaign TOW — Match validators (client-safe, pure Zod)

import { z } from 'zod'

// Story 3.1 — Admin: manual match creation
const createMatchBase = z.object({
  army1Id: z.string().min(1, "L'armée 1 est requise"),
  result1: z.enum(['victory', 'defeat', 'draw']).nullable(),
  army2Id: z.string().min(1, "L'armée 2 est requise"),
  result2: z.enum(['victory', 'defeat', 'draw']).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Format d'heure invalide (HH:MM)"),
  evolutionsEntered: z.boolean(),
})

function validateMatchResultPair(
  data: z.output<typeof createMatchBase>,
  ctx: z.RefinementCtx
): void {
  const r1 = data.result1
  const r2 = data.result2
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
}

export const createMatchSchema = createMatchBase.superRefine(validateMatchResultPair)
export type CreateMatchInput = z.infer<typeof createMatchSchema>

// Story 3.3 — Match result entry
export const submitMatchResultSchema = z.object({
  matchId: z.string().min(1),
  result: z.enum(['victory', 'defeat', 'draw']),
})
export type SubmitMatchResultInput = z.infer<typeof submitMatchResultSchema>

// Unit selection before match result
export const submitUnitSelectionSchema = z.object({
  matchId: z.string().min(1),
  unitIds: z.array(z.string().min(1))
    .min(1, 'At least one unit must be selected')
    .max(50, 'Too many units selected'),
})
export type SubmitUnitSelectionInput = z.infer<typeof submitUnitSelectionSchema>

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
