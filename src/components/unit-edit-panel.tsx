// Campaign TOW — UnitEditPanel component
// Direct edit panel for unit stat modifiers, gains, and XP.
// Visible only to army owners and admins.

import React, { useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog'
import { getTierLabel, getTierColor } from '../lib/tier'
import type { TierLevel } from '../lib/tier'

// ---------------------------------------------------------------------------
// Types (mirroring DB schema shapes)
// ---------------------------------------------------------------------------

interface StatModifierRow {
  id: string
  unitId: string
  stat: string
  delta: number
  source: string
  temporary: boolean
}

interface UnitGainRow {
  id: string
  unitId: string
  description: string
}

// Server function types (passed as props to avoid import-protection issues)
type AddStatModifierFn = (args: {
  data: {
    armyId: string
    unitId: string
    stat: (typeof STAT_KEYS)[number]
    delta: number
    source: string
    temporary: boolean
  }
}) => Promise<{ success: boolean; data?: { id: string }; error?: { code: string; message: string } }>

type RemoveStatModifierFn = (args: {
  data: { armyId: string; modifierId: string }
}) => Promise<{ success: boolean; data?: null; error?: { code: string; message: string } }>

type AddUnitGainFn = (args: {
  data: { armyId: string; unitId: string; description: string }
}) => Promise<{ success: boolean; data?: { id: string }; error?: { code: string; message: string } }>

type RemoveUnitGainFn = (args: {
  data: { armyId: string; gainId: string }
}) => Promise<{ success: boolean; data?: null; error?: { code: string; message: string } }>

type UpdateXpFn = (args: {
  data: { armyId: string; unitId: string; xp: number }
}) => Promise<{ success: boolean; data?: { xp: number; tier: TierLevel }; error?: { code: string; message: string } }>

type UpdatePointsFn = (args: {
  data: { armyId: string; unitId: string; points: number | null }
}) => Promise<{ success: boolean; error?: { code: string; message: string } }>

type UpdateNicknameFn = (args: {
  data: { armyId: string; unitId: string; nickname: string | null }
}) => Promise<{ success: boolean; error?: { code: string; message: string } }>

type FetchUnitDeltasFn = (args: {
  data: { armyId: string; unitId: string }
}) => Promise<{ statModifiers: StatModifierRow[]; unitGains: UnitGainRow[] }>

type ToggleMountFn = (args: {
  data: { armyId: string; subProfileId: string; isMount: boolean }
}) => Promise<{ success: boolean; data?: null; error?: { code: string; message: string } }>

type SendToGraveyardFn = (args: {
  data: { armyId: string; unitId: string; reason: string }
}) => Promise<{ success: boolean; error?: { code: string; message: string } }>

type DeleteUnitFn = (args: {
  data: { armyId: string; unitId: string }
}) => Promise<{ success: boolean; error?: { code: string; message: string } }>

interface SubProfileItem {
  id: string
  label: string
  isMount: boolean
  sortOrder: number
}

interface UnitEditPanelProps {
  armyId: string
  unitId: string
  unitName: string
  unitNickname: string | null
  unitType: string
  currentXp: number
  currentPoints: number | null
  subProfiles: SubProfileItem[]
  isAdmin: boolean
  onClose: () => void
  onMutationSuccess: () => Promise<void>
  addStatModifierFn: AddStatModifierFn
  removeStatModifierFn: RemoveStatModifierFn
  addUnitGainFn: AddUnitGainFn
  removeUnitGainFn: RemoveUnitGainFn
  updateXpFn: UpdateXpFn
  updatePointsFn: UpdatePointsFn
  updateNicknameFn: UpdateNicknameFn
  fetchUnitDeltasFn: FetchUnitDeltasFn
  toggleMountFn: ToggleMountFn
  sendToGraveyardFn: SendToGraveyardFn
  deleteUnitFn: DeleteUnitFn
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAT_KEYS = ['m', 'cc', 'ct', 'f', 'e', 'pv', 'i', 'a', 'cd'] as const
type StatKey = (typeof STAT_KEYS)[number]

const STAT_LABELS: Record<StatKey, string> = {
  m: 'M',
  cc: 'CC',
  ct: 'CT',
  f: 'F',
  e: 'E',
  pv: 'PV',
  i: 'I',
  a: 'A',
  cd: 'CD',
}

// ---------------------------------------------------------------------------
// Feedback message hook
// ---------------------------------------------------------------------------

function useFeedback() {
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function show(text: string, isError: boolean) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMessage({ text, isError })
    timerRef.current = setTimeout(() => setMessage(null), 3000)
  }

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return { message, show }
}

// ---------------------------------------------------------------------------
// Main UnitEditPanel component
// ---------------------------------------------------------------------------

export function UnitEditPanel({
  armyId,
  unitId,
  unitName,
  unitNickname,
  unitType,
  currentXp,
  currentPoints,
  subProfiles,
  isAdmin,
  onClose,
  onMutationSuccess,
  addStatModifierFn,
  removeStatModifierFn,
  addUnitGainFn,
  removeUnitGainFn,
  updateXpFn,
  updatePointsFn,
  updateNicknameFn,
  fetchUnitDeltasFn,
  toggleMountFn,
  sendToGraveyardFn,
  deleteUnitFn,
}: UnitEditPanelProps) {
  // Delta data state
  const [statModifiers, setStatModifiers] = useState<StatModifierRow[]>([])
  const [unitGains, setUnitGains] = useState<UnitGainRow[]>([])
  const [loadingDeltas, setLoadingDeltas] = useState(true)

  // Stat modifier form state
  const [modStat, setModStat] = useState<StatKey>('m')
  const [modDelta, setModDelta] = useState<string>('')
  const [modSource, setModSource] = useState('')
  const [modTemporary, setModTemporary] = useState(false)
  const [addingMod, setAddingMod] = useState(false)
  const modFeedback = useFeedback()

  // Unit gain form state
  const [gainDescription, setGainDescription] = useState('')
  const [addingGain, setAddingGain] = useState(false)
  const gainFeedback = useFeedback()

  // XP form state
  const [xpValue, setXpValue] = useState(String(currentXp))
  const [updatingXp, setUpdatingXp] = useState(false)
  const [currentTier, setCurrentTier] = useState<TierLevel | null>(null)
  const [confirmedXpUpdate, setConfirmedXpUpdate] = useState(false)
  const xpFeedback = useFeedback()

  // Points form state
  const [pointsValue, setPointsValue] = useState(currentPoints !== null ? String(currentPoints) : '')
  const [updatingPoints, setUpdatingPoints] = useState(false)
  const pointsFeedback = useFeedback()

  // Sync pointsValue when currentPoints prop changes (avoid stale value after parent re-render)
  useEffect(() => {
    setPointsValue(currentPoints !== null ? String(currentPoints) : '')
  }, [currentPoints])

  // Sync nicknameInput when unitNickname prop changes
  useEffect(() => {
    setNicknameInput(unitNickname ?? '')
  }, [unitNickname])

  // Mount toggle state
  const [togglingMountId, setTogglingMountId] = useState<string | null>(null)
  const mountFeedback = useFeedback()

  // Deleting state
  const [deletingModId, setDeletingModId] = useState<string | null>(null)
  const [deletingGainId, setDeletingGainId] = useState<string | null>(null)

  // Graveyard state
  const [showGraveyardInput, setShowGraveyardInput] = useState(false)
  const [graveyardReason, setGraveyardReason] = useState('')
  const [sendingToGraveyard, setSendingToGraveyard] = useState(false)
  const [deletingUnit, setDeletingUnit] = useState(false)
  const dangerFeedback = useFeedback()

  // Nickname state
  const [nicknameInput, setNicknameInput] = useState(unitNickname ?? '')
  const [nicknameSaving, setNicknameSaving] = useState(false)
  const nicknameFeedback = useFeedback()

  // Sync xpValue when currentXp prop changes (C3 — avoid stale XP after parent re-render)
  useEffect(() => {
    setXpValue(String(currentXp))
  }, [currentXp])

  // Fetch deltas on mount and after unitId changes (M2 — cancel on unmount)
  // Skip fetch when not admin — deltas are only displayed in admin-only sections
  useEffect(() => {
    if (!isAdmin) {
      setLoadingDeltas(false)
      return
    }
    let mounted = true
    async function fetchDeltas() {
      setLoadingDeltas(true)
      try {
        const result = await fetchUnitDeltasFn({ data: { armyId, unitId } })
        if (!mounted) return
        setStatModifiers(result.statModifiers)
        setUnitGains(result.unitGains)
      } catch {
        // silently fail — data will just not refresh
      } finally {
        if (mounted) setLoadingDeltas(false)
      }
    }
    void fetchDeltas()
    return () => { mounted = false }
  }, [unitId, isAdmin]) // armyId and fetchUnitDeltasFn are stable for the lifecycle of a given panel

  // Refetch deltas after mutations (not tied to mount lifecycle)
  const refetchDeltas = async () => {
    try {
      const result = await fetchUnitDeltasFn({ data: { armyId, unitId } })
      setStatModifiers(result.statModifiers)
      setUnitGains(result.unitGains)
    } catch {
      // silently fail
    }
  }

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
    setAddingMod(true)
    try {
      const result = await addStatModifierFn({
        data: {
          armyId,
          unitId,
          stat: modStat,
          delta: num,
          source: modSource.trim(),
          temporary: modTemporary,
        },
      })
      if (result.success) {
        modFeedback.show('Modificateur ajouté', false)
        // Reset form
        setModStat('m')
        setModDelta('')
        setModSource('')
        setModTemporary(false)
        await refetchDeltas()
        await onMutationSuccess()
      } else {
        modFeedback.show(result.error?.message ?? 'Erreur inconnue', true)
      }
    } catch {
      modFeedback.show('Erreur lors de l\'ajout', true)
    } finally {
      setAddingMod(false)
    }
  }

  const handleDeleteStatModifier = async (modifierId: string) => {
    if (!window.confirm('Supprimer ce modificateur ?')) return
    setDeletingModId(modifierId)
    try {
      const result = await removeStatModifierFn({ data: { armyId, modifierId } })
      if (result.success) {
        await refetchDeltas()
        await onMutationSuccess()
      } else {
        modFeedback.show(result.error?.message ?? 'Erreur lors de la suppression', true)
      }
    } catch {
      modFeedback.show('Erreur lors de la suppression', true)
    } finally {
      setDeletingModId(null)
    }
  }

  const handleAddUnitGain = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gainDescription.trim()) {
      gainFeedback.show('La description ne peut pas être vide', true)
      return
    }
    setAddingGain(true)
    try {
      const result = await addUnitGainFn({
        data: {
          armyId,
          unitId,
          description: gainDescription.trim(),
        },
      })
      if (result.success) {
        gainFeedback.show('Capacité ajoutée', false)
        setGainDescription('')
        await refetchDeltas()
        await onMutationSuccess()
      } else {
        gainFeedback.show(result.error?.message ?? 'Erreur inconnue', true)
      }
    } catch {
      gainFeedback.show('Erreur lors de l\'ajout', true)
    } finally {
      setAddingGain(false)
    }
  }

  const handleDeleteUnitGain = async (gainId: string) => {
    if (!window.confirm('Supprimer cette capacité ?')) return
    setDeletingGainId(gainId)
    try {
      const result = await removeUnitGainFn({ data: { armyId, gainId } })
      if (result.success) {
        await refetchDeltas()
        await onMutationSuccess()
      } else {
        gainFeedback.show(result.error?.message ?? 'Erreur lors de la suppression', true)
      }
    } catch {
      gainFeedback.show('Erreur lors de la suppression', true)
    } finally {
      setDeletingGainId(null)
    }
  }

  const handleUpdateXp = async (e: React.FormEvent) => {
    e.preventDefault()
    const xp = Number(xpValue)
    if (!Number.isInteger(xp) || xp < 0) {
      xpFeedback.show('XP doit être un nombre entier >= 0', true)
      return
    }
    setUpdatingXp(true)
    try {
      const result = await updateXpFn({ data: { armyId, unitId, xp } })
      if (result.success && result.data) {
        setCurrentTier(result.data.tier)
        setConfirmedXpUpdate(true)
        xpFeedback.show(`XP mis à jour (${result.data.xp} XP)`, false)
        await onMutationSuccess()
      } else {
        xpFeedback.show(result.error?.message ?? 'Erreur inconnue', true)
      }
    } catch {
      xpFeedback.show('Erreur lors de la mise à jour', true)
    } finally {
      setUpdatingXp(false)
    }
  }

  const handleUpdatePoints = async (e: React.FormEvent) => {
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
    setUpdatingPoints(true)
    try {
      const result = await updatePointsFn({ data: { armyId, unitId, points } })
      if (result.success) {
        pointsFeedback.show(points !== null ? `Coût mis à jour (${points} pts)` : 'Coût effacé', false)
        await onMutationSuccess()
      } else {
        pointsFeedback.show(result.error?.message ?? 'Erreur inconnue', true)
      }
    } catch {
      pointsFeedback.show('Erreur lors de la mise à jour', true)
    } finally {
      setUpdatingPoints(false)
    }
  }

  async function handleNicknameBlur() {
    if (nicknameSaving) return
    const trimmed = nicknameInput.trim()
    const newVal = trimmed === '' ? null : trimmed
    if (newVal === (unitNickname ?? null)) return
    setNicknameSaving(true)
    try {
      const result = await updateNicknameFn({ data: { armyId, unitId, nickname: newVal } })
      if (result.success) {
        nicknameFeedback.show('Surnom enregistré', false)
        await onMutationSuccess()
      } else {
        nicknameFeedback.show(result.error?.message ?? 'Erreur', true)
      }
    } catch {
      nicknameFeedback.show('Erreur réseau', true)
    } finally {
      setNicknameSaving(false)
    }
  }

  // Feedback message helper
  const FeedbackMsg = ({ message }: { message: { text: string; isError: boolean } | null }) => {
    if (!message) return null
    return (
      <p
        style={{
          fontSize: '0.8rem',
          marginTop: '0.5rem',
          color: message.isError ? 'var(--color-malus)' : 'var(--color-bonus)',
        }}
      >
        {message.text}
      </p>
    )
  }

  const tierLabel = currentTier !== null ? getTierLabel(currentTier, unitType) : null
  const tierColor = currentTier !== null ? getTierColor(currentTier) : undefined

  return (
    <div
      data-testid={`unit-edit-panel-${unitId}`}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1rem',
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '0.875rem',
            color: 'var(--color-text-primary)',
          }}
        >
          Modifier : {unitName}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section Surnom — blur-save nickname field */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ marginBottom: '1rem' }}>
        <Label htmlFor={`nickname-${unitId}`} style={{ fontSize: '0.8rem' }}>Surnom</Label>
        <Input
          id={`nickname-${unitId}`}
          value={nicknameInput}
          onChange={(e) => setNicknameInput(e.target.value)}
          onBlur={handleNicknameBlur}
          disabled={nicknameSaving}
          maxLength={80}
          placeholder="Aucun surnom"
          style={{ marginTop: '0.25rem' }}
        />
        <FeedbackMsg message={nicknameFeedback.message} />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 0 — Sous-profils (mount flag toggle) */}
      {/* Only visible for units with 2+ sub-profiles */}
      {/* ------------------------------------------------------------------ */}
      {subProfiles.length >= 2 && (
        <section
          data-testid="section-sub-profiles"
          style={{ marginBottom: '1.5rem' }}
        >
          <h4
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-section-label)',
              marginBottom: '0.75rem',
            }}
          >
            Sous-profils
          </h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {subProfiles.map((sp) => (
              <li
                key={sp.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  padding: '0.375rem 0',
                  borderBottom: '1px solid var(--color-separator)',
                }}
              >
                <span style={{ color: 'var(--color-text-primary)' }}>{sp.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Label htmlFor={`mount-${sp.id}`} style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                    Monture
                  </Label>
                  <Switch
                    id={`mount-${sp.id}`}
                    checked={sp.isMount}
                    disabled={togglingMountId === sp.id}
                    onCheckedChange={async (checked) => {
                      setTogglingMountId(sp.id)
                      try {
                        const result = await toggleMountFn({ data: { armyId, subProfileId: sp.id, isMount: checked } })
                        if (result.success) {
                          await onMutationSuccess()
                        } else {
                          mountFeedback.show(result.error?.message ?? 'Erreur inconnue', true)
                        }
                      } catch {
                        mountFeedback.show('Erreur lors de la mise à jour', true)
                      } finally {
                        setTogglingMountId(null)
                      }
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <FeedbackMsg message={mountFeedback.message} />
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Section 1 — Modificateurs de stats (admin only) */}
      {/* ------------------------------------------------------------------ */}
      {isAdmin && <section
        data-testid="section-stat-modifiers"
        style={{ marginBottom: '1.5rem' }}
      >
        <h4
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-section-label)',
            marginBottom: '0.75rem',
          }}
        >
          Modificateurs de stats
        </h4>

        {/* Existing modifiers list */}
        {loadingDeltas ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            Chargement...
          </p>
        ) : statModifiers.length === 0 ? (
          <p
            data-testid="no-modifiers-empty-state"
            style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}
          >
            Aucun modificateur
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '0.75rem' }}>
            {statModifiers.map((mod) => (
              <li
                key={mod.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  padding: '0.25rem 0',
                  borderBottom: '1px solid var(--color-separator)',
                }}
              >
                <span style={{ fontWeight: 700, minWidth: '2rem' }}>
                  {mod.stat.toUpperCase()}
                </span>
                <span style={{ color: mod.delta > 0 ? 'var(--color-bonus)' : mod.delta < 0 ? 'var(--color-malus)' : 'var(--color-text-secondary)' }}>
                  {mod.delta > 0 ? '+' : ''}{mod.delta}
                </span>
                <span style={{ color: 'var(--color-text-secondary)', flex: 1 }}>
                  {mod.source}
                </span>
                {mod.temporary && (
                  <span className="bg-amber-100 text-amber-800 text-xs px-1 rounded">
                    temp.
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deletingModId === mod.id}
                  onClick={() => handleDeleteStatModifier(mod.id)}
                  style={{ fontSize: '0.75rem', padding: '0.25rem', color: 'var(--color-malus)' }}
                >
                  {deletingModId === mod.id ? '...' : 'supprimer'}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Add stat modifier form */}
        <form onSubmit={handleAddStatModifier} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Stat select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <Label htmlFor={`mod-stat-${unitId}`} style={{ fontSize: '0.75rem' }}>
                Stat
              </Label>
              <Select
                value={modStat}
                onValueChange={(v) => setModStat(v as StatKey)}
              >
                <SelectTrigger id={`mod-stat-${unitId}`} style={{ width: '5rem' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAT_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {STAT_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Delta input with +/- buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <Label htmlFor={`mod-delta-${unitId}`} style={{ fontSize: '0.75rem' }}>
                Delta
              </Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  type="button"
                  disabled={addingMod}
                  onClick={() => setModDelta(String((parseInt(modDelta, 10) || 0) - 1))}
                  className="delta-stepper"
                  style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--color-separator)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-malus)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: addingMod ? 'not-allowed' : 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    opacity: addingMod ? 0.5 : 1,
                  }}
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
                  style={{ width: '4.5rem', textAlign: 'center' }}
                  required
                />
                <button
                  type="button"
                  disabled={addingMod}
                  onClick={() => setModDelta(String((parseInt(modDelta, 10) || 0) + 1))}
                  className="delta-stepper"
                  style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--color-separator)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-bonus)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: addingMod ? 'not-allowed' : 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    opacity: addingMod ? 0.5 : 1,
                  }}
                  aria-label="Augmenter delta"
                >
                  +
                </button>
              </div>
            </div>

            {/* Source input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
              <Label htmlFor={`mod-source-${unitId}`} style={{ fontSize: '0.75rem' }}>
                Source
              </Label>
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

          {/* Temporary checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={modTemporary}
              onChange={(e) => setModTemporary(e.target.checked)}
            />
            Temporaire
          </label>

          <Button
            type="submit"
            disabled={addingMod}
            size="sm"
            style={{ alignSelf: 'flex-start' }}
          >
            {addingMod ? 'Ajout...' : 'Ajouter'}
          </Button>
          <FeedbackMsg message={modFeedback.message} />
        </form>
      </section>}

      {/* ------------------------------------------------------------------ */}
      {/* Section 2 — Capacités acquises (admin only) */}
      {/* ------------------------------------------------------------------ */}
      {isAdmin && <section
        data-testid="section-unit-gains"
        style={{ marginBottom: '1.5rem' }}
      >
        <h4
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-section-label)',
            marginBottom: '0.75rem',
          }}
        >
          Capacités acquises
        </h4>

        {/* Existing gains list */}
        {loadingDeltas ? null : unitGains.length === 0 ? (
          <p
            data-testid="no-gains-empty-state"
            style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}
          >
            Aucune capacité acquise
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '0.75rem' }}>
            {unitGains.map((gain) => (
              <li
                key={gain.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  padding: '0.25rem 0',
                  borderBottom: '1px solid var(--color-separator)',
                }}
              >
                <span style={{ flex: 1 }}>{gain.description}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deletingGainId === gain.id}
                  onClick={() => handleDeleteUnitGain(gain.id)}
                  style={{ fontSize: '0.75rem', padding: '0.25rem', color: 'var(--color-malus)' }}
                >
                  {deletingGainId === gain.id ? '...' : 'supprimer'}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Add unit gain form */}
        <form onSubmit={handleAddUnitGain} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <Label htmlFor={`gain-desc-${unitId}`} style={{ fontSize: '0.75rem' }}>
              Description
            </Label>
            <Input
              id={`gain-desc-${unitId}`}
              type="text"
              value={gainDescription}
              onChange={(e) => setGainDescription(e.target.value)}
              placeholder="Mur de boucliers, Résistance..."
              required
            />
          </div>

          <Button
            type="submit"
            disabled={addingGain}
            size="sm"
            style={{ alignSelf: 'flex-start' }}
          >
            {addingGain ? 'Ajout...' : 'Ajouter'}
          </Button>
          <FeedbackMsg message={gainFeedback.message} />
        </form>
      </section>}

      {/* ------------------------------------------------------------------ */}
      {/* Section 3 — Coût en points */}
      {/* ------------------------------------------------------------------ */}
      <section data-testid="section-points">
        <h4
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-section-label)',
            marginBottom: '0.75rem',
          }}
        >
          Coût en points
        </h4>

        <form onSubmit={handleUpdatePoints} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <Label htmlFor={`points-input-${unitId}`} style={{ fontSize: '0.75rem' }}>
                Valeur
              </Label>
              <Input
                id={`points-input-${unitId}`}
                type="number"
                min={0}
                step={1}
                value={pointsValue}
                onChange={(e) => setPointsValue(e.target.value)}
                style={{ width: '6rem' }}
                disabled={updatingPoints}
              />
            </div>
            <Button
              type="submit"
              disabled={updatingPoints}
              size="sm"
            >
              {updatingPoints ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </div>
          <FeedbackMsg message={pointsFeedback.message} />
        </form>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 4 — Points d'expérience */}
      {/* ------------------------------------------------------------------ */}
      <section data-testid="section-xp" style={{ borderTop: '1px solid var(--color-border)', marginTop: '1rem', paddingTop: '1rem' }}>
        <h4
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-section-label)',
            marginBottom: '0.75rem',
          }}
        >
          Points d'expérience
        </h4>

        <form onSubmit={handleUpdateXp} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <Label htmlFor={`xp-input-${unitId}`} style={{ fontSize: '0.75rem' }}>
                XP total
              </Label>
              <Input
                id={`xp-input-${unitId}`}
                type="number"
                min={0}
                step={1}
                value={xpValue}
                onChange={(e) => setXpValue(e.target.value)}
                style={{ width: '6rem' }}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={updatingXp}
              size="sm"
            >
              {updatingXp ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </div>

          {/* Show recalculated tier after update — always visible once confirmed, not tied to feedback timer */}
          {confirmedXpUpdate && currentTier !== null && currentTier > 0 && tierLabel && (
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: tierColor }}>
              {tierLabel}
            </p>
          )}
          {confirmedXpUpdate && currentTier === 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Aucun palier atteint
            </p>
          )}

          <FeedbackMsg message={xpFeedback.message} />
        </form>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 4 — Zone de danger */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          marginTop: '1.5rem',
          paddingTop: '1rem',
        }}
      >
        <h4
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-malus)',
            marginBottom: '0.75rem',
          }}
        >
          Zone de danger
        </h4>

        {/* Send to graveyard */}
        {!showGraveyardInput ? (
          <button
            data-testid="graveyard-button"
            onClick={() => setShowGraveyardInput(true)}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.5rem 1rem',
              border: '1px solid #b45309',
              borderRadius: '6px',
              background: 'transparent',
              color: '#b45309',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              marginBottom: '0.75rem',
            }}
          >
            Envoyer au cimetière
          </button>
        ) : (
          <div
            data-testid="graveyard-form"
            style={{
              marginBottom: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <Input
              data-testid="graveyard-reason-input"
              type="text"
              placeholder="Raison (ex: tué par un dragon)"
              value={graveyardReason}
              onChange={(e) => setGraveyardReason(e.target.value)}
              maxLength={200}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                data-testid="graveyard-confirm"
                size="sm"
                disabled={sendingToGraveyard || !graveyardReason.trim()}
                onClick={async () => {
                  if (!graveyardReason.trim()) {
                    dangerFeedback.show('La raison ne peut pas être vide', true)
                    return
                  }
                  setSendingToGraveyard(true)
                  try {
                    const result = await sendToGraveyardFn({
                      data: { armyId, unitId, reason: graveyardReason.trim() },
                    })
                    if (result.success) {
                      await onMutationSuccess()
                    } else {
                      dangerFeedback.show(result.error?.message ?? 'Erreur inconnue', true)
                    }
                  } catch {
                    dangerFeedback.show("Erreur lors de l'envoi au cimetière", true)
                  } finally {
                    setSendingToGraveyard(false)
                  }
                }}
                style={{ background: '#334155', color: '#fff' }}
              >
                {sendingToGraveyard ? 'Envoi...' : 'Confirmer'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowGraveyardInput(false)
                  setGraveyardReason('')
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Permanent deletion */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              data-testid="delete-unit-button"
              style={{
                display: 'block',
                width: '100%',
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '6px',
                background: 'var(--color-malus)',
                color: '#fff',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              Supprimer définitivement
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Suppression définitive</AlertDialogTitle>
              <AlertDialogDescription>
                Attention : cette unité, ses sous-profils, ses modificateurs de stats, ses gains et
                son historique XP par match seront définitivement supprimés. Si elle a été détruite
                lors d'un affrontement, envoyez-la plutôt au cimetière pour garder une trace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                style={{
                  border: '1px solid #334155',
                  color: '#334155',
                }}
              >
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                data-testid="delete-unit-confirm"
                disabled={deletingUnit}
                onClick={async (e) => {
                  e.preventDefault()
                  setDeletingUnit(true)
                  try {
                    const result = await deleteUnitFn({
                      data: { armyId, unitId },
                    })
                    if (result.success) {
                      await onMutationSuccess()
                    } else {
                      dangerFeedback.show(result.error?.message ?? 'Erreur inconnue', true)
                    }
                  } catch {
                    dangerFeedback.show('Erreur lors de la suppression', true)
                  } finally {
                    setDeletingUnit(false)
                  }
                }}
                style={{
                  background: 'var(--color-malus)',
                  color: '#fff',
                }}
              >
                {deletingUnit ? 'Suppression...' : 'Détruire'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <FeedbackMsg message={dangerFeedback.message} />
      </div>
    </div>
  )
}
