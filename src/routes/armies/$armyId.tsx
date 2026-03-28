// Campaign TOW — /armies/$armyId route
// Public consultation: all authenticated users (including guests) can view any army.

import { createFileRoute, Link } from '@tanstack/react-router'
import { loadArmyFn } from '../../server-fns/unit-queries'
import { ArmyView } from '../../components/army-view'

export const Route = createFileRoute('/armies/$armyId')({
  staleTime: 30_000,
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
  component: function ArmyPage() {
    const data = Route.useLoaderData()
    return <ArmyView {...data} />
  },
})
