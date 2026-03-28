// Campaign TOW — PointsSection: point cost editing for UnitEditPanel

import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { updatePointsFn } from '../../server-fns/unit-mutations'
import { useFeedback, FeedbackMsg } from './use-feedback'

interface PointsSectionProps {
  armyId: string
  unitId: string
  currentPoints: number | null
}

export function PointsSection({ armyId, unitId, currentPoints }: PointsSectionProps) {
  const [pointsValue, setPointsValue] = useState(currentPoints !== null ? String(currentPoints) : '')
  const pointsFeedback = useFeedback()
  const router = useRouter()

  const { mutate, isPending } = useMutation({
    mutationFn: (points: number | null) => updatePointsFn({ data: { armyId, unitId, points } }),
    onSuccess: (result, points) => {
      if (result.success) {
        pointsFeedback.show(points !== null ? `Coût mis à jour (${points} pts)` : 'Coût effacé', false)
        void router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
      } else {
        pointsFeedback.show(result.error.message, true)
      }
    },
    onError: () => {
      pointsFeedback.show('Erreur réseau', true)
    },
  })

  useEffect(() => {
    setPointsValue(currentPoints !== null ? String(currentPoints) : '')
  }, [currentPoints])

  function handleUpdatePoints() {
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
    mutate(points)
  }

  return (
    <section data-testid="section-points">
      <h4 className="font-[family-name:var(--font-body)] font-bold text-xs uppercase tracking-wider text-[var(--color-section-label)] mb-3">
        Coût en points
      </h4>
      <div className="flex flex-col gap-2">
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
          <Button type="button" onClick={handleUpdatePoints} disabled={isPending} size="sm">
            {isPending ? 'Mise à jour...' : 'Mettre à jour'}
          </Button>
        </div>
        <FeedbackMsg message={pointsFeedback.message} />
      </div>
    </section>
  )
}
