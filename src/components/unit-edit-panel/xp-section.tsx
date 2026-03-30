// Campaign TOW — XpSection: XP editing with tier display for UnitEditPanel

import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { updateXpFn } from '../../server-fns/unit-mutations'
import { useFeedback, FeedbackMsg } from './use-feedback'
import { getTierLabel, tierColorClass } from '../../lib/tier'
import type { TierLevel } from '../../lib/tier'
import { cn } from '../../lib/utils'

interface XpSectionProps {
  armyId: string
  unitId: string
  unitType: string
  currentXp: number
}

export function XpSection({ armyId, unitId, unitType, currentXp }: XpSectionProps) {
  const [xpValue, setXpValue] = useState(String(currentXp))
  const [currentTier, setCurrentTier] = useState<TierLevel | null>(null)
  const [confirmedXpUpdate, setConfirmedXpUpdate] = useState(false)
  const xpFeedback = useFeedback()
  const router = useRouter()

  const { mutate, isPending } = useMutation({
    mutationFn: (xp: number) => updateXpFn({ data: { armyId, unitId, xp } }),
    onSuccess: (result) => {
      if (result.success) {
        xpFeedback.show(`XP mis à jour (${result.data.xp} XP)`, false)
        setCurrentTier(result.data.tier)
        setConfirmedXpUpdate(true)
        void router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
      } else {
        xpFeedback.show(result.error.message, true)
      }
    },
    onError: () => {
      xpFeedback.show('Erreur réseau', true)
    },
  })

  useEffect(() => {
    setXpValue(String(currentXp))
  }, [currentXp])

  const tierLabel = currentTier !== null ? getTierLabel(currentTier, unitType) : null

  function handleUpdateXp(e: React.FormEvent) {
    e.preventDefault()
    const xp = Number(xpValue)
    if (!Number.isInteger(xp) || xp < 0) {
      xpFeedback.show('XP doit être un nombre entier >= 0', true)
      return
    }
    mutate(xp)
  }

  return (
    <section data-testid="section-xp" className="border-t border-[var(--color-border)] mt-4 pt-4">
      <h4 className="font-[family-name:var(--font-body)] font-bold text-xs uppercase tracking-wider text-[var(--color-section-label)] mb-3">
        Points d'expérience
      </h4>
      <form onSubmit={handleUpdateXp} className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`xp-input-${unitId}`} className="text-xs">XP total</Label>
            <Input
              id={`xp-input-${unitId}`}
              type="number"
              min={0}
              step={1}
              value={xpValue}
              onChange={(e) => setXpValue(e.target.value)}
              className="w-24"
              required
              disabled={isPending}
            />
          </div>
          <Button type="submit" disabled={isPending} size="sm">
            {isPending ? 'Mise à jour...' : 'Mettre à jour'}
          </Button>
        </div>
        {confirmedXpUpdate && currentTier !== null && currentTier > 0 && tierLabel && (
          <p className={cn('text-xs font-semibold', tierColorClass(currentTier))}>{tierLabel}</p>
        )}
        {confirmedXpUpdate && currentTier === 0 && (
          <p className="text-xs text-[var(--color-text-secondary)]">Aucun palier atteint</p>
        )}
        <FeedbackMsg message={xpFeedback.message} />
      </form>
    </section>
  )
}
