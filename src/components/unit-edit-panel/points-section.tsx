// Campaign TOW — PointsSection: point cost editing for UnitEditPanel

import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { updatePointsFn } from '../../server-fns/unit-mutations'
import { useFeedback, FeedbackMsg } from './use-feedback'
import { useUnitMutation } from './use-unit-mutation'

interface PointsSectionProps {
  armyId: string
  unitId: string
  currentPoints: number | null
  onMutationSuccess: () => Promise<void>
}

export function PointsSection({ armyId, unitId, currentPoints, onMutationSuccess }: PointsSectionProps) {
  const [pointsValue, setPointsValue] = useState(currentPoints !== null ? String(currentPoints) : '')
  const pointsFeedback = useFeedback()
  const { mutate, isPending } = useUnitMutation(pointsFeedback, onMutationSuccess)

  useEffect(() => {
    setPointsValue(currentPoints !== null ? String(currentPoints) : '')
  }, [currentPoints])

  async function handleUpdatePoints(e: React.FormEvent) {
    e.preventDefault()
    let points: number | null
    if (pointsValue.trim() === '') {
      points = null
    } else {
      const parsed = parseInt(pointsValue, 10)
      if (Number.isNaN(parsed) || parsed < 0) {
        pointsFeedback.show('Veuillez entrer un nombre valide', true)
        return
      }
      points = parsed
    }
    await mutate(
      () => updatePointsFn({ data: { armyId, unitId, points } }),
      { successMsg: points !== null ? `Coût mis à jour (${points} pts)` : 'Coût effacé' },
    )
  }

  return (
    <section data-testid="section-points">
      <h4 className="font-[family-name:var(--font-body)] font-bold text-xs uppercase tracking-wider text-[var(--color-section-label)] mb-3">
        Coût en points
      </h4>
      <form onSubmit={handleUpdatePoints} className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`points-input-${unitId}`} className="text-xs">Valeur</Label>
            <Input
              id={`points-input-${unitId}`}
              type="number"
              min={0}
              step={1}
              value={pointsValue}
              onChange={(e) => setPointsValue(e.target.value)}
              className="w-24"
              disabled={isPending}
            />
          </div>
          <Button type="submit" disabled={isPending} size="sm">
            {isPending ? 'Mise à jour...' : 'Mettre à jour'}
          </Button>
        </div>
        <FeedbackMsg message={pointsFeedback.message} />
      </form>
    </section>
  )
}
