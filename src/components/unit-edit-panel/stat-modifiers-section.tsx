// Campaign TOW — StatModifiersSection: add/remove stat modifiers for UnitEditPanel

import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { addStatModifierFn, removeStatModifierFn, VALID_STATS } from '../../server-fns/unit-mutations'
import { useFeedback, FeedbackMsg } from './use-feedback'
import { useUnitMutation } from './use-unit-mutation'
import type { StatModifierRow } from './types'

type StatKey = (typeof VALID_STATS)[number]

const STAT_LABELS: Record<StatKey, string> = {
  m: 'M', cc: 'CC', ct: 'CT', f: 'F', e: 'E', pv: 'PV', i: 'I', a: 'A', cd: 'CD',
}

interface StatModifiersSectionProps {
  armyId: string
  unitId: string
  statModifiers: StatModifierRow[]
  loadingDeltas: boolean
  onMutationSuccess: () => Promise<void>
  onDeltaChange: () => Promise<void>
}

export function StatModifiersSection({
  armyId,
  unitId,
  statModifiers,
  loadingDeltas,
  onMutationSuccess,
  onDeltaChange,
}: StatModifiersSectionProps) {
  const [modStat, setModStat] = useState<StatKey>('m')
  const [modDelta, setModDelta] = useState<string>('')
  const [modSource, setModSource] = useState('')
  const [modTemporary, setModTemporary] = useState(false)
  const [deletingModId, setDeletingModId] = useState<string | null>(null)
  const mountedRef = useRef(true)
  useEffect(() => { return () => { mountedRef.current = false } }, [])
  const modFeedback = useFeedback()
  const { mutate, isPending: addingMod } = useUnitMutation(modFeedback, onMutationSuccess)

  const handleAddStatModifier = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = Number(modDelta)
    if (!Number.isInteger(num) || num === 0) {
      modFeedback.show('Le delta doit être un entier non nul', true)
      return
    }
    if (!modSource.trim()) {
      modFeedback.show('La source ne peut pas être vide', true)
      return
    }
    await mutate(
      () => addStatModifierFn({ data: { armyId, unitId, stat: modStat, delta: num, source: modSource.trim(), temporary: modTemporary } }),
      {
        successMsg: 'Modificateur ajouté',
        onSuccess: async () => {
          setModStat('m')
          setModDelta('')
          setModSource('')
          setModTemporary(false)
          await onDeltaChange()
        },
      },
    )
  }

  const handleDeleteStatModifier = async (modifierId: string) => {
    if (!window.confirm('Supprimer ce modificateur ?')) return
    setDeletingModId(modifierId)
    try {
      const result = await removeStatModifierFn({ data: { armyId, modifierId } })
      if (result.success) {
        await onMutationSuccess()
        await onDeltaChange()
      } else {
        if (mountedRef.current) modFeedback.show(result.error.message, true)
      }
    } catch {
      if (mountedRef.current) modFeedback.show('Erreur lors de la suppression', true)
    } finally {
      if (mountedRef.current) setDeletingModId(null)
    }
  }

  return (
    <section data-testid="section-stat-modifiers" className="mb-6">
      <h4 className="font-[family-name:var(--font-body)] font-bold text-xs uppercase tracking-wider text-[var(--color-section-label)] mb-3">
        Modificateurs de stats
      </h4>

      {loadingDeltas ? (
        <p className="text-xs text-[var(--color-text-secondary)]">Chargement...</p>
      ) : statModifiers.length === 0 ? (
        <p data-testid="no-modifiers-empty-state" className="text-xs text-[var(--color-text-secondary)] mb-3">Aucun modificateur</p>
      ) : (
        <ul className="mb-3">
          {statModifiers.map((mod) => (
            <li key={mod.id} className="flex items-center gap-2 text-xs py-1 border-b border-[var(--color-separator)]">
              <span className="font-bold min-w-[2rem]">{mod.stat.toUpperCase()}</span>
              <span className={mod.delta > 0 ? 'text-[var(--color-bonus)]' : 'text-[var(--color-malus)]'}>
                {mod.delta > 0 ? '+' : ''}{mod.delta}
              </span>
              <span className="text-[var(--color-text-secondary)] flex-1">{mod.source}</span>
              {mod.temporary && (
                <span className="bg-amber-100 text-amber-800 text-xs px-1 rounded">temp.</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={deletingModId === mod.id}
                onClick={() => handleDeleteStatModifier(mod.id)}
                className="text-xs p-1 text-[var(--color-malus)]"
              >
                {deletingModId === mod.id ? '...' : 'supprimer'}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAddStatModifier} className="flex flex-col gap-2">
        <div className="flex gap-2 flex-wrap">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`mod-stat-${unitId}`} className="text-xs">Stat</Label>
            <Select value={modStat} onValueChange={(v) => setModStat(v as StatKey)}>
              <SelectTrigger id={`mod-stat-${unitId}`} className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALID_STATS.map((key) => (
                  <SelectItem key={key} value={key}>{STAT_LABELS[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor={`mod-delta-${unitId}`} className="text-xs">Delta</Label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={addingMod}
                onClick={() => setModDelta(String((parseInt(modDelta, 10) || 0) - 1))}
                className="w-8 h-8 rounded-md border border-[var(--color-separator)] bg-[var(--color-surface)] text-[var(--color-malus)] font-bold text-base grid place-items-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Diminuer delta"
              >
                −
              </button>
              <Input
                id={`mod-delta-${unitId}`}
                type="number"
                step="1"
                value={modDelta}
                onChange={(e) => setModDelta(e.target.value)}
                placeholder="+1 / -1"
                className="w-[4.5rem] text-center"
                required
              />
              <button
                type="button"
                disabled={addingMod}
                onClick={() => setModDelta(String((parseInt(modDelta, 10) || 0) + 1))}
                className="w-8 h-8 rounded-md border border-[var(--color-separator)] bg-[var(--color-surface)] text-[var(--color-bonus)] font-bold text-base grid place-items-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Augmenter delta"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 flex-1">
            <Label htmlFor={`mod-source-${unitId}`} className="text-xs">Source</Label>
            <Input
              id={`mod-source-${unitId}`}
              type="text"
              value={modSource}
              onChange={(e) => setModSource(e.target.value)}
              placeholder="tier_up, injury, destruction..."
              required
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={modTemporary} onChange={(e) => setModTemporary(e.target.checked)} />
          Temporaire
        </label>

        <Button type="submit" disabled={addingMod} size="sm" className="self-start">
          {addingMod ? 'Ajout...' : 'Ajouter'}
        </Button>
        <FeedbackMsg message={modFeedback.message} />
      </form>
    </section>
  )
}
