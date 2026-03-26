// Campaign TOW — Army validators (client-safe, pure Zod)

import { z } from 'zod'

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
