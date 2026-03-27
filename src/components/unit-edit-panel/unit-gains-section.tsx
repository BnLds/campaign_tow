// Campaign TOW — UnitGainsSection: unit gains (add/remove) for UnitEditPanel

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { addUnitGainFn, removeUnitGainFn } from '../../server-fns/unit-mutations'
import { useFeedback, FeedbackMsg } from './use-feedback'
import type { UnitGainRow } from './types'

interface UnitGainsSectionProps {
  armyId: string
  unitId: string
  unitGains: UnitGainRow[]
  loadingDeltas: boolean
  onDeltaChange: () => Promise<void>
}

export function UnitGainsSection({
  armyId,
  unitId,
  unitGains,
  loadingDeltas,
  onDeltaChange,
}: UnitGainsSectionProps) {
  const [gainDescription, setGainDescription] = useState('')
  const gainFeedback = useFeedback()
  const router = useRouter()

  const { mutate, isPending: addingGain } = useMutation({
    mutationFn: (description: string) => addUnitGainFn({ data: { armyId, unitId, description } }),
    onSuccess: async (result) => {
      if (result.success) {
        gainFeedback.show('Capacité ajoutée', false)
        setGainDescription('')
        void router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
        await onDeltaChange()
      } else {
        gainFeedback.show(result.error.message, true)
      }
    },
    onError: () => {
      gainFeedback.show('Erreur réseau', true)
    },
  })

  const handleAddUnitGain = (e: React.FormEvent) => {
    e.preventDefault()
    if (!gainDescription.trim()) {
      gainFeedback.show('La description ne peut pas être vide', true)
      return
    }
    mutate(gainDescription.trim())
  }

  const { mutate: deleteUnitGain, isPending: deletingGain, variables: deletingGainVars } = useMutation({
    mutationFn: async (gainId: string) => {
      const result = await removeUnitGainFn({ data: { armyId, gainId } })
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: async () => {
      void router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
      await onDeltaChange()
    },
    onError: (error) => {
      gainFeedback.show(error.message, true)
    },
  })

  const handleDeleteUnitGain = (gainId: string) => {
    if (!window.confirm('Supprimer cette capacité ?')) return
    deleteUnitGain(gainId)
  }

  return (
    <section data-testid="section-unit-gains" className="mb-6">
      <h4 className="font-[family-name:var(--font-body)] font-bold text-xs uppercase tracking-wider text-[var(--color-section-label)] mb-3">
        Capacités acquises
      </h4>

      {loadingDeltas ? null : unitGains.length === 0 ? (
        <p data-testid="no-gains-empty-state" className="text-xs text-[var(--color-text-secondary)] mb-3">
          Aucune capacité acquise
        </p>
      ) : (
        <ul className="list-none p-0 mb-3">
          {unitGains.map((gain) => (
            <li key={gain.id} className="flex items-center gap-2 text-xs py-1 border-b border-[var(--color-separator)]">
              <span className="flex-1">{gain.description}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={deletingGain && deletingGainVars === gain.id}
                onClick={() => handleDeleteUnitGain(gain.id)}
                className="text-xs p-1 text-[var(--color-malus)]"
              >
                {deletingGain && deletingGainVars === gain.id ? '...' : 'supprimer'}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAddUnitGain} className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`gain-desc-${unitId}`} className="text-xs">Description</Label>
          <Input
            id={`gain-desc-${unitId}`}
            type="text"
            value={gainDescription}
            onChange={(e) => setGainDescription(e.target.value)}
            placeholder="Mur de boucliers, Résistance..."
            required
          />
        </div>
        <Button type="submit" disabled={addingGain} size="sm" className="self-start">
          {addingGain ? 'Ajout...' : 'Ajouter'}
        </Button>
        <FeedbackMsg message={gainFeedback.message} />
      </form>
    </section>
  )
}
