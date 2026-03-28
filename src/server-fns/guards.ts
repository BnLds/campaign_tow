// Campaign TOW — Shared ownership guards (return-based pattern)

import type { ServerResult } from '../lib/types'

// Derive types from DB query return values
type QueryModule = typeof import('../db/queries')

export type UnitById = NonNullable<Awaited<ReturnType<QueryModule['getUnitById']>>>
type ModifierById = NonNullable<Awaited<ReturnType<QueryModule['getStatModifierById']>>>
type GainById = NonNullable<Awaited<ReturnType<QueryModule['getUnitGainById']>>>
type SubProfileById = NonNullable<Awaited<ReturnType<QueryModule['getSubProfileById']>>>

export type GuardResult<T> = { ok: true; data: T } | { ok: false; result: ServerResult<never> }

export async function assertUnitBelongsToArmy(
  unitId: string,
  armyId: string,
): Promise<GuardResult<UnitById>> {
  const { getUnitById } = await import('../db/queries')
  const unit = await getUnitById(unitId)
  if (!unit || unit.armyId !== armyId) {
    return { ok: false, result: { success: false, error: { code: 'FORBIDDEN', message: "Cette unité n'appartient pas à cette armée" } } }
  }
  return { ok: true, data: unit }
}

export async function assertModifierBelongsToArmy(
  modifierId: string,
  armyId: string,
): Promise<GuardResult<{ modifier: ModifierById; unit: UnitById }>> {
  const { getStatModifierById } = await import('../db/queries')
  const modifier = await getStatModifierById(modifierId)
  if (!modifier) {
    return { ok: false, result: { success: false, error: { code: 'NOT_FOUND', message: 'Modificateur introuvable' } } }
  }
  const unitGuard = await assertUnitBelongsToArmy(modifier.unitId, armyId)
  if (!unitGuard.ok) {
    return { ok: false, result: { success: false, error: { code: 'FORBIDDEN', message: "Ce modificateur n'appartient pas à cette armée" } } }
  }
  return { ok: true, data: { modifier, unit: unitGuard.data } }
}

export async function assertGainBelongsToArmy(
  gainId: string,
  armyId: string,
): Promise<GuardResult<{ gain: GainById; unit: UnitById }>> {
  const { getUnitGainById } = await import('../db/queries')
  const gain = await getUnitGainById(gainId)
  if (!gain) {
    return { ok: false, result: { success: false, error: { code: 'NOT_FOUND', message: 'Capacité introuvable' } } }
  }
  const unitGuard = await assertUnitBelongsToArmy(gain.unitId, armyId)
  if (!unitGuard.ok) {
    return { ok: false, result: { success: false, error: { code: 'FORBIDDEN', message: "Cette capacité n'appartient pas à cette armée" } } }
  }
  return { ok: true, data: { gain, unit: unitGuard.data } }
}

export async function assertSubProfileBelongsToArmy(
  subProfileId: string,
  armyId: string,
): Promise<GuardResult<{ subProfile: SubProfileById; unit: UnitById }>> {
  const { getSubProfileById } = await import('../db/queries')
  const subProfile = await getSubProfileById(subProfileId)
  if (!subProfile) {
    return { ok: false, result: { success: false, error: { code: 'NOT_FOUND', message: 'Sous-profil introuvable' } } }
  }
  const unitGuard = await assertUnitBelongsToArmy(subProfile.unitId, armyId)
  if (!unitGuard.ok) {
    return { ok: false, result: { success: false, error: { code: 'FORBIDDEN', message: "Ce sous-profil n'appartient pas à cette armée" } } }
  }
  return { ok: true, data: { subProfile, unit: unitGuard.data } }
}
