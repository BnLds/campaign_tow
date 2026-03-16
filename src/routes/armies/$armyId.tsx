// Campaign TOW — /armies/$armyId route
// Public consultation: all authenticated users (including guests) can view any army.

import { createFileRoute, notFound, Link, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { useHydrated } from '../../lib/useHydrated'
import { authMiddleware, armyOwnerMiddleware } from '../../lib/middleware'
import { UnitCard } from '../../components/unit-card'
import { UnitEditPanel } from '../../components/unit-edit-panel'
import { composeUnitView } from '../../lib/delta-composer'
import { calculateTier } from '../../lib/tier'
import type { ComposedUnitView } from '../../lib/delta-composer'

// ---------------------------------------------------------------------------
// Server function — load army with units and deltas
// ---------------------------------------------------------------------------

const loadArmyFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator(z.object({ armyId: z.string() }))
  .handler(async ({ data, context }) => {
    const { getArmyWithUnits, getUnitDeltas } = await import('../../db/queries')

    const army = await getArmyWithUnits(data.armyId)
    if (!army) {
      throw notFound()
    }

    const unitIds = army.units.map((u) => u.id)
    const { statModifiers: allMods, unitGains: allGains } = await getUnitDeltas(unitIds)

    // For each unit, group modifiers/gains and compose view
    const unitCards = army.units.map((unit) => {
      const unitMods = allMods.filter((m) => m.unitId === unit.id)
      const unitGainsList = allGains.filter((g) => g.unitId === unit.id)
      const composedView = composeUnitView(unit.subProfiles, unitMods, unitGainsList)
      const tier = calculateTier(unit.xp, unit.type)

      return {
        unit: { id: unit.id, name: unit.name, type: unit.type, xp: unit.xp },
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
      isOwner,
    }
  })

// ---------------------------------------------------------------------------
// Server function — fetch unit deltas (for edit panel)
// ---------------------------------------------------------------------------

const fetchUnitDeltasFn = createServerFn({ method: 'GET' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(z.object({ armyId: z.string(), unitId: z.string() }))
  .handler(async ({ data }) => {
    const { getUnitById, getStatModifiers, getUnitGains } = await import('../../db/queries')
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return { statModifiers: [], unitGains: [] }
    }
    const [statModifiers, unitGains] = await Promise.all([
      getStatModifiers(data.unitId),
      getUnitGains(data.unitId),
    ])
    return { statModifiers, unitGains }
  })

// ---------------------------------------------------------------------------
// Server function — add stat modifier
// ---------------------------------------------------------------------------

const VALID_STATS = ['m', 'cc', 'ct', 'f', 'e', 'pv', 'i', 'a', 'cd'] as const

const addStatModifierFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(
    z.object({
      armyId: z.string(),
      unitId: z.string(),
      stat: z.enum(VALID_STATS),
      delta: z.number().int().refine((v) => v !== 0, {
        message: 'Le delta doit être un entier non nul',
      }),
      source: z.string().trim().min(1, { message: 'La source ne peut pas être vide' }).max(200),
      temporary: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const { getUnitById, insertStatModifier } = await import('../../db/queries')
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: "Cette unité n'appartient pas à cette armée" },
      }
    }
    const row = await insertStatModifier(data.unitId, data.stat, data.delta, data.source, data.temporary)
    return { success: true as const, data: { id: row.id } }
  })

// ---------------------------------------------------------------------------
// Server function — remove stat modifier
// ---------------------------------------------------------------------------

const removeStatModifierFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(z.object({ armyId: z.string(), modifierId: z.string() }))
  .handler(async ({ data }) => {
    const { getStatModifierById, getUnitById, deleteStatModifier } = await import('../../db/queries')
    const modifier = await getStatModifierById(data.modifierId)
    if (!modifier) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Modificateur introuvable' },
      }
    }
    const unit = await getUnitById(modifier.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return {
        success: false as const,
        error: { code: 'FORBIDDEN', message: "Ce modificateur n'appartient pas à cette armée" },
      }
    }
    const deleted = await deleteStatModifier(data.modifierId)
    if (!deleted) {
      return { success: false as const, error: { code: 'NOT_FOUND', message: 'Modificateur introuvable' } }
    }
    return { success: true as const, data: null }
  })

// ---------------------------------------------------------------------------
// Server function — add unit gain
// ---------------------------------------------------------------------------

const addUnitGainFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(
    z.object({
      armyId: z.string(),
      unitId: z.string(),
      description: z.string().trim().min(1, { message: 'La description ne peut pas être vide' }).max(200),
    }),
  )
  .handler(async ({ data }) => {
    const { getUnitById, insertUnitGain } = await import('../../db/queries')
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: "Cette unité n'appartient pas à cette armée" },
      }
    }
    const row = await insertUnitGain(data.unitId, data.description)
    return { success: true as const, data: { id: row.id } }
  })

// ---------------------------------------------------------------------------
// Server function — remove unit gain
// ---------------------------------------------------------------------------

const removeUnitGainFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(z.object({ armyId: z.string(), gainId: z.string() }))
  .handler(async ({ data }) => {
    const { getUnitGainById, getUnitById, deleteUnitGain } = await import('../../db/queries')
    const gain = await getUnitGainById(data.gainId)
    if (!gain) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Capacité introuvable' },
      }
    }
    const unit = await getUnitById(gain.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return {
        success: false as const,
        error: { code: 'FORBIDDEN', message: "Cette capacité n'appartient pas à cette armée" },
      }
    }
    const deleted = await deleteUnitGain(data.gainId)
    if (!deleted) {
      return { success: false as const, error: { code: 'NOT_FOUND', message: 'Capacité introuvable' } }
    }
    return { success: true as const, data: null }
  })

// ---------------------------------------------------------------------------
// Server function — toggle sub-profile mount flag
// ---------------------------------------------------------------------------

const toggleMountFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(z.object({ armyId: z.string(), subProfileId: z.string(), isMount: z.boolean() }))
  .handler(async ({ data }) => {
    const { getSubProfileById, getUnitById, updateSubProfileIsMount } = await import('../../db/queries')
    const sp = await getSubProfileById(data.subProfileId)
    if (!sp) {
      return { success: false as const, error: { code: 'NOT_FOUND', message: 'Sous-profil introuvable' } }
    }
    const unit = await getUnitById(sp.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return { success: false as const, error: { code: 'FORBIDDEN', message: "Ce sous-profil n'appartient pas à cette armée" } }
    }
    await updateSubProfileIsMount(data.subProfileId, data.isMount)
    return { success: true as const, data: null }
  })

// ---------------------------------------------------------------------------
// Server function — update unit XP
// ---------------------------------------------------------------------------

const updateXpFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(
    z.object({
      armyId: z.string(),
      unitId: z.string(),
      xp: z.number().int().min(0, { message: 'XP doit être >= 0' }),
    }),
  )
  .handler(async ({ data }) => {
    const { getUnitById, updateUnitXp } = await import('../../db/queries')
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: "Cette unité n'appartient pas à cette armée" },
      }
    }
    await updateUnitXp(data.unitId, data.xp)
    const tier = calculateTier(data.xp, unit.type)
    return { success: true as const, data: { xp: data.xp, tier } }
  })

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/armies/$armyId')({
  loader: async ({ params }) => {
    return loadArmyFn({ data: { armyId: params.armyId } })
  },
  notFoundComponent: () => (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
        Armée introuvable
      </p>
      <Link to="/" style={{ color: 'var(--color-brand)' }}>
        Retour à l'accueil
      </Link>
    </main>
  ),
  component: ArmyView,
})

// ---------------------------------------------------------------------------
// Unit type grouping order
// ---------------------------------------------------------------------------

const TYPE_ORDER = ['Personnages', 'Unités de base', 'Unités spéciales', 'Unités rares']

function groupUnitsByType(
  unitCards: Array<{
    unit: { id: string; name: string; type: string; xp: number }
    composedView: ComposedUnitView
    tier: 0 | 1 | 2 | 3
    subProfiles: Array<{ id: string; label: string; isMount: boolean; sortOrder: number }>
  }>
) {
  const groups = new Map<string, typeof unitCards>()
  for (const card of unitCards) {
    const existing = groups.get(card.unit.type)
    if (existing) {
      existing.push(card)
    } else {
      groups.set(card.unit.type, [card])
    }
  }
  // Return in canonical order, then any remaining types alphabetically
  const ordered: Array<{ type: string; cards: typeof unitCards }> = []
  for (const type of TYPE_ORDER) {
    const cards = groups.get(type)
    if (cards) {
      ordered.push({ type, cards })
      groups.delete(type)
    }
  }
  for (const [type, cards] of groups) {
    ordered.push({ type, cards })
  }
  return ordered
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------


function ArmyView() {
  const { army, unitCards, isOwner } = Route.useLoaderData()
  const hydrated = useHydrated()
  const router = useRouter()
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)

  useEffect(() => {
    if (hydrated) {
      document.documentElement.setAttribute('data-app-hydrated', 'true')
    }
  }, [hydrated])

  const groups = groupUnitsByType(unitCards)

  const handleMutationSuccess = async () => {
    await router.invalidate()
  }

  return (
    <main style={{ padding: '1rem', maxWidth: '720px', margin: '0 auto' }}>
      {/* Army header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
          <Link
            to="/armies"
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              border: '1px solid #d9cfbf',
              background: '#fff9f2',
              color: 'var(--color-brand)',
              fontWeight: 800,
              display: 'grid',
              placeItems: 'center',
              textDecoration: 'none',
              flexShrink: 0,
              fontSize: '1rem',
            }}
            aria-label="Retour aux armées"
          >
            ‹
          </Link>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.5rem',
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            {army.name}
          </h1>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          {army.faction}
          {army.player && ` — ${army.player.displayName}`}
        </p>
      </div>

      {/* Units grouped by type */}
      {groups.map(({ type, cards }) => (
        <section key={type} style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-section-label)',
              marginBottom: '0.75rem',
            }}
          >
            {type}
          </h2>
          {cards.map((card) => (
            <div key={card.unit.id}>
              <UnitCard
                unit={card.unit}
                composedView={card.composedView}
                tier={card.tier}
                action={isOwner ? (
                  <button
                    data-testid={`edit-unit-${card.unit.id}`}
                    onClick={() =>
                      setEditingUnitId(
                        editingUnitId === card.unit.id ? null : card.unit.id,
                      )
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                    }}
                  >
                    ✏ Modifier
                  </button>
                ) : undefined}
              />
              {isOwner && editingUnitId === card.unit.id && (
                <UnitEditPanel
                  armyId={army.id}
                  unitId={card.unit.id}
                  unitName={card.unit.name}
                  currentXp={card.unit.xp}
                  subProfiles={card.subProfiles}
                  onClose={() => setEditingUnitId(null)}
                  onMutationSuccess={handleMutationSuccess}
                  addStatModifierFn={addStatModifierFn}
                  removeStatModifierFn={removeStatModifierFn}
                  addUnitGainFn={addUnitGainFn}
                  removeUnitGainFn={removeUnitGainFn}
                  updateXpFn={updateXpFn}
                  fetchUnitDeltasFn={fetchUnitDeltasFn}
                  toggleMountFn={toggleMountFn}
                />
              )}
            </div>
          ))}
        </section>
      ))}

      {unitCards.length === 0 && (
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Cette armée ne contient aucune unité.
        </p>
      )}

    </main>
  )
}
