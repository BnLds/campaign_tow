// Campaign TOW — /armies/$armyId route
// Public consultation: all authenticated users (including guests) can view any army.

import { createFileRoute, notFound, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { useEffect } from 'react'
import { useHydrated } from '../../lib/useHydrated'
import { authMiddleware } from '../../lib/middleware'
import { UnitCard } from '../../components/UnitCard'
import { composeUnitView } from '../../lib/delta-composer'
import { calculateTier } from '../../lib/tier'
import type { ComposedUnitView } from '../../lib/delta-composer'

// ---------------------------------------------------------------------------
// Server function — load army with units and deltas
// ---------------------------------------------------------------------------

const loadArmyFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator(z.object({ armyId: z.string() }))
  .handler(async ({ data }) => {
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
      }
    })

    return {
      army: {
        id: army.id,
        name: army.name,
        faction: army.faction,
        player: army.player,
      },
      unitCards,
    }
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
  const { army, unitCards } = Route.useLoaderData()
  const hydrated = useHydrated()

  useEffect(() => {
    if (hydrated) {
      document.documentElement.setAttribute('data-app-hydrated', 'true')
    }
  }, [hydrated])

  const groups = groupUnitsByType(unitCards)

  return (
    <main style={{ padding: '1rem', maxWidth: '720px', margin: '0 auto' }}>
      {/* Army header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1.5rem',
            color: 'var(--color-text-primary)',
            marginBottom: '0.25rem',
          }}
        >
          {army.name}
        </h1>
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
            <UnitCard
              key={card.unit.id}
              unit={card.unit}
              composedView={card.composedView}
              tier={card.tier}
            />
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
