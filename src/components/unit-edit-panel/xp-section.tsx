// Campaign TOW — XpSection: XP editing with tier display for UnitEditPanel

import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { updateXpFn } from '../../server-fns/unit-mutations'
import { useFeedback, FeedbackMsg } from './use-feedback'
import { useUnitMutation } from './use-unit-mutation'
import { getTierLabel, getTierColor } from '../../lib/tier'
import type { TierLevel } from '../../lib/tier'

interface XpSectionProps {
  armyId: string
  unitId: string
  unitType: string
  currentXp: number
  onMutationSuccess: () => Promise<void>
}

export function XpSection({ armyId, unitId, unitType, currentXp, onMutationSuccess }: XpSectionProps) {
  const [xpValue, setXpValue] = useState(String(currentXp))
  const [currentTier, setCurrentTier] = useState<TierLevel | null>(null)
  const [confirmedXpUpdate, setConfirmedXpUpdate] = useState(false)
  const xpFeedback = useFeedback()
  const { mutate, isPending } = useUnitMutation(xpFeedback, onMutationSuccess)

  useEffect(() => {
    setXpValue(String(currentXp))
  }, [currentXp])

  const tierLabel = currentTier !== null ? getTierLabel(currentTier, unitType) : null
  const tierColor = currentTier !== null ? getTierColor(currentTier) : undefined

  async function handleUpdateXp(e: React.FormEvent) {
    e.preventDefault()
    const xp = Number(xpValue)
    if (!Number.isInteger(xp) || xp < 0) {
      xpFeedback.show('XP doit être un nombre entier >= 0', true)
      return
    }
    await mutate(
      () => updateXpFn({ data: { armyId, unitId, xp } }),
      {
        successMsg: `XP mis à jour (${xp} XP)`,
        onSuccess: (data) => { setCurrentTier(data.tier); setConfirmedXpUpdate(true) },
      },
    )
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
          <p className="text-xs font-semibold" style={{ color: tierColor }}>{tierLabel}</p>
        )}
        {confirmedXpUpdate && currentTier === 0 && (
          <p className="text-xs text-[var(--color-text-secondary)]">Aucun palier atteint</p>
        )}
        <FeedbackMsg message={xpFeedback.message} />
      </form>
    </section>
  )
}
