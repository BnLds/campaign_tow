import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware, armyOwnerMiddleware } from '../lib/middleware'
import { composeUnitView } from '../lib/delta-composer'
import { calculateTier } from '../lib/tier'
import { notFound } from '@tanstack/react-router'
import { assertUnitBelongsToArmy } from './guards'

export const loadArmyFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator(z.object({ armyId: z.string() }))
  .handler(async ({ data, context }) => {
    const { getArmyWithUnits, getUnitDeltas, getGraveyardUnits } = await import('../db/queries')

    const army = await getArmyWithUnits(data.armyId)
    if (!army) {
      throw notFound()
    }

    const unitIds = army.units.map((u) => u.id)
    const [{ statModifiers: allMods, unitGains: allGains }, graveyardUnits] = await Promise.all([
      getUnitDeltas(unitIds),
      getGraveyardUnits(data.armyId),
    ])

    // For each unit, group modifiers/gains and compose view
    const unitCards = army.units.map((unit) => {
      const unitMods = allMods.filter((m) => m.unitId === unit.id)
      const unitGainsList = allGains.filter((g) => g.unitId === unit.id)
      const composedView = composeUnitView(unit.subProfiles, unitMods, unitGainsList)
      const tier = calculateTier(unit.xp, unit.type)

      const hasPertesCata = unitGainsList.some((g) => g.type === 'pertes_catastrophiques')
      const effectivePoints = hasPertesCata && unit.points != null ? Math.floor(unit.points / 2) : unit.points

      return {
        unit: { id: unit.id, name: unit.name, nickname: unit.nickname, type: unit.type, xp: unit.xp, points: unit.points, effectivePoints },
        composedView,
        tier,
        subProfiles: unit.subProfiles.map((sp) => ({
          id: sp.id,
          label: sp.label,
          isMount: sp.isMount,
          sortOrder: sp.sortOrder,
        })),
      }
    })

    const session = context.session
    const isOwner =
      !session.isGuest &&
      (session.isAdmin || army.playerId === session.playerId)

    return {
      army: {
        id: army.id,
        name: army.name,
        faction: army.faction,
        player: army.player,
      },
      unitCards,
      graveyardUnits,
      isOwner,
      isAdmin: session.isAdmin,
    }
  })

export type LoadArmyResult = Awaited<ReturnType<typeof loadArmyFn>>

export const fetchUnitDeltasFn = createServerFn({ method: 'GET' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(z.object({ armyId: z.string(), unitId: z.string() }))
  .handler(async ({ data }) => {
    const guard = await assertUnitBelongsToArmy(data.unitId, data.armyId)
    if (!guard.ok) throw notFound()
    const { getStatModifiers, getUnitGains } = await import('../db/queries')
    const [statModifiers, unitGains] = await Promise.all([
      getStatModifiers(data.unitId),
      getUnitGains(data.unitId),
    ])
    return { statModifiers, unitGains }
  })
