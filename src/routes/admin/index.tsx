import { useForm } from '@tanstack/react-form'
import { createFileRoute, redirect, useRouteContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { adminMiddleware } from '../../lib/middleware'
import type { ServerResult } from '../../lib/types'
import { createPlayerSchema, importArmySchema, assignArmySchema, addUnitSchema, updateSubProfileSchema, createMatchSchema } from '../../lib/validators'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useHydrated } from '../../lib/useHydrated'

const createPlayerFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator(createPlayerSchema)
  .handler(async ({ data }): Promise<ServerResult<{ id: string; username: string; displayName: string }>> => {
    const bcryptjs = await import('bcryptjs')
    const { checkUsernameExists, createPlayer } = await import('../../db/queries')

    // AC5 — Duplicate username check
    const exists = await checkUsernameExists(data.username)
    if (exists) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: "Ce nom d'utilisateur existe déjà" },
      }
    }

    // AC2 — Hash password and create player
    const passwordHash = await bcryptjs.hash(data.tempPassword, 12)
    try {
      const player = await createPlayer(data.username, passwordHash)
      return { success: true, data: player }
    } catch {
      // Unique constraint violation (race condition between check and insert)
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: "Ce nom d'utilisateur existe déjà" },
      }
    }
  })

// Story 1.6 — listPlayersFn: GET loader, returns all players (no ServerResult wrapper)
const listPlayersFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getAllPlayers } = await import('../../db/queries')
    return getAllPlayers()
  })

// Story 1.6 — deletePlayerFn: POST mutation, returns ServerResult<null>
const deletePlayerFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ playerId: z.string() }))
  .handler(async ({ context, data }): Promise<ServerResult<null>> => {
    if (data.playerId === context.session.playerId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Impossible de supprimer votre propre compte' } }
    }
    const { deletePlayer } = await import('../../db/queries')
    await deletePlayer(data.playerId)
    return { success: true, data: null }
  })

// Story 2.1 — importArmyFn: POST, parses OWB text and inserts army + units + sub_profiles
const importArmyFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator(importArmySchema)
  .handler(async ({ data }): Promise<ServerResult<{ armyId: string; armyName: string; unitCount: number }>> => {
    const { parseOwbExport } = await import('../../lib/owb-parser')
    const { createArmyWithUnits } = await import('../../db/queries')

    let parsed
    try {
      parsed = parseOwbExport(data.rawText)
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err instanceof Error ? err.message : "Erreur lors de l'import",
        },
      }
    }

    try {
      const { armyId, unitCount } = await createArmyWithUnits(parsed)
      return { success: true, data: { armyId, armyName: parsed.name, unitCount } }
    } catch {
      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: "Erreur serveur lors de l'enregistrement — veuillez réessayer",
        },
      }
    }
  })

// Story 2.1 — listArmiesFn: GET, returns all armies with player info
const listArmiesFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getAllArmies } = await import('../../db/queries')
    return getAllArmies()
  })

// Story 2.1 — assignArmyFn: POST, assigns a player to an army
const assignArmyFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator(assignArmySchema)
  .handler(async ({ data }): Promise<ServerResult<null>> => {
    const { assignArmyToPlayer } = await import('../../db/queries')
    try {
      const assigned = await assignArmyToPlayer(data.armyId, data.playerId)
      if (!assigned) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Armée introuvable' } }
      }
      return { success: true, data: null }
    } catch {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: "Erreur lors de l'assignation — joueur invalide" } }
    }
  })

// Story 2.2 — addUnitFn: POST, manually adds a unit + sub_profile to an army
const addUnitFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator(addUnitSchema)
  .handler(async ({ data }): Promise<ServerResult<{ unitId: string; subProfileId: string }>> => {
    const { insertUnit } = await import('../../db/queries')
    try {
      const result = await insertUnit(data.armyId, data.name, data.type, {
        m: data.m,
        cc: data.cc,
        ct: data.ct,
        f: data.f,
        e: data.e,
        pv: data.pv,
        i: data.i,
        a: data.a,
        cd: data.cd,
      })
      return { success: true, data: result }
    } catch (err) {
      // FK violation — armyId does not exist (PostgreSQL error code 23503)
      const pgCode = (err as { code?: string }).code
      if (pgCode === '23503') {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Armée introuvable' } }
      }
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Erreur serveur — veuillez réessayer' } }
    }
  })

// Story 2.2 — updateSubProfileFn: POST, updates stat fields on a sub_profile row
const updateSubProfileFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator(updateSubProfileSchema)
  .handler(async ({ data }): Promise<ServerResult<null>> => {
    const { updateSubProfileStats } = await import('../../db/queries')
    try {
      const updated = await updateSubProfileStats(data.subProfileId, {
        m: data.m,
        cc: data.cc,
        ct: data.ct,
        f: data.f,
        e: data.e,
        pv: data.pv,
        i: data.i,
        a: data.a,
        cd: data.cd,
      })
      if (!updated) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Sous-profil introuvable' } }
      }
      return { success: true, data: null }
    } catch {
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Erreur serveur — veuillez réessayer' } }
    }
  })

// Story 3.1 — createMatchFn: POST admin tool to create a match with two participants
const createMatchFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator(createMatchSchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ matchId: string }>> => {
    if (data.army1Id === data.army2Id) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Les deux armées doivent être différentes' } }
    }
    // Validate result coherence when both are set: (victory,defeat), (defeat,victory), or (draw,draw)
    if (data.result1 !== null && data.result2 !== null) {
      const validPairs: Array<[string, string]> = [['victory', 'defeat'], ['defeat', 'victory'], ['draw', 'draw']]
      if (!validPairs.some(([r1, r2]) => r1 === data.result1 && r2 === data.result2)) {
        return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Résultats incohérents (victoire/victoire ou défaite/défaite non autorisé)' } }
      }
    }
    const { createMatchWithParticipants } = await import('../../db/queries')
    const matchDate = new Date(data.date)
    if (isNaN(matchDate.getTime())) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Date invalide' } }
    }
    const result = await createMatchWithParticipants({
      army1Id: data.army1Id,
      result1: data.result1,
      army2Id: data.army2Id,
      result2: data.result2,
      matchDate,
      evolutionsEntered: data.evolutionsEntered,
      createdByPlayerId: context.session.playerId,
    })
    return { success: true, data: result }
  })

// Story 2.2 — getArmyUnitsFn: GET, returns units + sub_profiles for a given army
const getArmyUnitsFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ armyId: z.string() }))
  .handler(async ({ data }) => {
    const { getUnitsForArmy } = await import('../../db/queries')
    return getUnitsForArmy(data.armyId)
  })

export const Route = createFileRoute('/admin/')({
  beforeLoad: ({ context }) => {
    const { session } = context
    if (!session?.isAdmin) {
      throw redirect({ to: '/' })
    }
  },
  component: AdminPage,
})

function AdminPage() {
  const context = useRouteContext({ from: '__root__' })
  const { session } = context
  const queryClient = useQueryClient()
  const [createdPlayer, setCreatedPlayer] = useState<{ username: string } | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)
  const [assignResult, setAssignResult] = useState<{ success: boolean; message: string } | null>(null)
  const [owbText, setOwbText] = useState('')
  const [importSubmitting, setImportSubmitting] = useState(false)
  const [assigningArmyId, setAssigningArmyId] = useState<string | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, string | undefined>>({})
  // Story 2.2 — Add unit form state
  const [addUnitArmyId, setAddUnitArmyId] = useState('')
  const [addUnitName, setAddUnitName] = useState('')
  const [addUnitType, setAddUnitType] = useState('')
  const [addUnitStats, setAddUnitStats] = useState({ m: '', cc: '', ct: '', f: '', e: '', pv: '', i: '', a: '', cd: '' })
  const [addUnitResult, setAddUnitResult] = useState<{ success: boolean; message: string } | null>(null)
  const [addUnitSubmitting, setAddUnitSubmitting] = useState(false)
  // Story 2.2 — Correction form state
  const [corrArmyId, setCorrArmyId] = useState('')
  const [corrUnitId, setCorrUnitId] = useState('')
  const [corrSubProfileId, setCorrSubProfileId] = useState('')
  const [corrStats, setCorrStats] = useState({ m: '', cc: '', ct: '', f: '', e: '', pv: '', i: '', a: '', cd: '' })
  const [corrResult, setCorrResult] = useState<{ success: boolean; message: string } | null>(null)
  const [corrSubmitting, setCorrSubmitting] = useState(false)
  // Story 3.1 — Create match form state
  const today = new Date().toISOString().slice(0, 10)
  const [matchArmy1Id, setMatchArmy1Id] = useState('')
  const [matchResult1, setMatchResult1] = useState<'victory' | 'defeat' | 'draw' | ''>('')
  const [matchArmy2Id, setMatchArmy2Id] = useState('')
  const [matchResult2, setMatchResult2] = useState<'victory' | 'defeat' | 'draw' | ''>('')
  const [matchDate, setMatchDate] = useState(today)
  const [matchEvolutions, setMatchEvolutions] = useState(false)
  const [matchResult, setMatchResult] = useState<{ success: boolean; message: string } | null>(null)
  const [matchSubmitting, setMatchSubmitting] = useState(false)
  const matchSubmitRef = useRef(false)
  // Story 2.2 — Double-submit guards (sync refs prevent race conditions on fast double-clicks)
  const addUnitSubmitRef = useRef(false)
  const correctStatsSubmitRef = useRef(false)
  const hydrated = useHydrated()

  useEffect(() => {
    if (hydrated) {
      document.documentElement.setAttribute('data-app-hydrated', 'true')
    }
  }, [hydrated])

  const playersQuery = useQuery({
    queryKey: ['admin', 'players'],
    queryFn: () => listPlayersFn(),
  })

  const armiesQuery = useQuery({
    queryKey: ['admin', 'armies'],
    queryFn: () => listArmiesFn(),
  })

  // Story 2.2 — fetch units for correction form when army is selected
  const armyUnitsQuery = useQuery({
    queryKey: ['admin', 'army-units', corrArmyId],
    queryFn: () => getArmyUnitsFn({ data: { armyId: corrArmyId } }),
    enabled: !!corrArmyId,
  })

  const form = useForm({
    defaultValues: { username: '', tempPassword: '' },
    validators: { onSubmit: createPlayerSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      setCreatedPlayer(null)
      const result = await createPlayerFn({ data: value })
      if (result.success) {
        setCreatedPlayer({ username: result.data.username })
        form.reset()
        await queryClient.invalidateQueries({ queryKey: ['admin', 'players'] })
      } else {
        setServerError(result.error.message)
      }
    },
  })

  const handleDelete = async (playerId: string, username: string) => {
    if (!window.confirm(`Supprimer le compte de ${username} ? Cette action est irréversible.`)) return
    setDeleteError(null)
    const result = await deletePlayerFn({ data: { playerId } })
    if (result.success) {
      setCreatedPlayer(null)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'players'] })
    } else {
      setDeleteError(result.error.message)
    }
  }

  const handleImport = async () => {
    setImportResult(null)
    setImportSubmitting(true)
    try {
      const result = await importArmyFn({ data: { rawText: owbText } })
      if (result.success) {
        setImportResult({
          success: true,
          message: `Armée "${result.data.armyName}" importée — ${result.data.unitCount} unité${result.data.unitCount > 1 ? 's' : ''}`,
        })
        setOwbText('')
        await queryClient.invalidateQueries({ queryKey: ['admin', 'armies'] })
      } else {
        setImportResult({ success: false, message: result.error.message })
      }
    } catch {
      setImportResult({ success: false, message: "Erreur réseau — veuillez réessayer" })
    } finally {
      setImportSubmitting(false)
    }
  }

  const handleAssign = async (armyId: string) => {
    const playerId = selectedPlayers[armyId]
    if (!playerId) return
    setAssigningArmyId(armyId)
    setAssignResult(null)
    try {
      const result = await assignArmyFn({ data: { armyId, playerId } })
      if (result.success) {
        setAssignResult({ success: true, message: 'Armée assignée avec succès' })
        await queryClient.invalidateQueries({ queryKey: ['admin', 'armies'] })
      } else {
        setAssignResult({ success: false, message: result.error.message })
      }
    } catch {
      setAssignResult({ success: false, message: "Erreur réseau — veuillez réessayer" })
    } finally {
      setAssigningArmyId(null)
    }
  }

  // Story 2.2 — selected unit and sub-profile for correction form
  const corrUnits = armyUnitsQuery.data ?? []
  const corrSelectedUnit = corrUnits.find((u) => u.id === corrUnitId)
  const corrSubProfiles = corrSelectedUnit?.subProfiles ?? []

  const handleCreateMatch = async () => {
    if (matchSubmitRef.current) return
    matchSubmitRef.current = true
    setMatchResult(null)
    setMatchSubmitting(true)
    try {
      const result = await createMatchFn({
        data: {
          army1Id: matchArmy1Id,
          result1: matchResult1 === '' ? null : matchResult1,
          army2Id: matchArmy2Id,
          result2: matchResult2 === '' ? null : matchResult2,
          date: matchDate,
          evolutionsEntered: matchEvolutions,
        },
      })
      if (result.success) {
        setMatchResult({ success: true, message: `Partie créée (id: ${result.data.matchId.slice(0, 8)}…)` })
        setMatchArmy1Id('')
        setMatchResult1('')
        setMatchArmy2Id('')
        setMatchResult2('')
        setMatchDate(today)
        setMatchEvolutions(false)
      } else {
        setMatchResult({ success: false, message: result.error.message })
      }
    } catch {
      setMatchResult({ success: false, message: 'Erreur réseau — veuillez réessayer' })
    } finally {
      matchSubmitRef.current = false
      setMatchSubmitting(false)
    }
  }

  const handleAddUnit = async () => {
    if (addUnitSubmitRef.current) return
    addUnitSubmitRef.current = true
    setAddUnitResult(null)
    setAddUnitSubmitting(true)
    try {
      const result = await addUnitFn({
        data: {
          armyId: addUnitArmyId,
          name: addUnitName,
          type: addUnitType,
          ...addUnitStats,
        },
      })
      if (result.success) {
        const successArmyId = addUnitArmyId
        setAddUnitResult({ success: true, message: `Unité "${addUnitName}" ajoutée avec succès` })
        setAddUnitName('')
        setAddUnitType('')
        setAddUnitArmyId('')
        setAddUnitStats({ m: '', cc: '', ct: '', f: '', e: '', pv: '', i: '', a: '', cd: '' })
        await queryClient.invalidateQueries({ queryKey: ['admin', 'armies'] })
        await queryClient.invalidateQueries({ queryKey: ['admin', 'army-units', successArmyId] })
      } else {
        setAddUnitResult({ success: false, message: result.error.message })
      }
    } catch {
      setAddUnitResult({ success: false, message: 'Erreur — veuillez réessayer' })
    } finally {
      addUnitSubmitRef.current = false
      setAddUnitSubmitting(false)
    }
  }

  const handleCorrectStats = async () => {
    if (correctStatsSubmitRef.current) return
    correctStatsSubmitRef.current = true
    setCorrResult(null)
    setCorrSubmitting(true)
    try {
      const result = await updateSubProfileFn({
        data: {
          subProfileId: corrSubProfileId,
          ...corrStats,
        },
      })
      if (result.success) {
        setCorrResult({ success: true, message: 'Stats mises à jour avec succès' })
        await queryClient.invalidateQueries({ queryKey: ['admin', 'army-units', corrArmyId] })
      } else {
        setCorrResult({ success: false, message: result.error.message })
      }
    } catch {
      setCorrResult({ success: false, message: 'Erreur — veuillez réessayer' })
    } finally {
      correctStatsSubmitRef.current = false
      setCorrSubmitting(false)
    }
  }

  const btnStyle = {
    background: 'var(--color-brand)',
    color: 'white',
    border: 'none',
    padding: '0.375rem 0.75rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
  }

  return (
    <main style={{ padding: '1.5rem', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand)', marginBottom: '1.5rem' }}>
        Administration
      </h1>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        Créer un compte joueur
      </h2>

      {createdPlayer && (
        <div
          data-testid="admin-success-message"
          style={{
            background: 'var(--color-bonus-bg)',
            border: '1px solid var(--color-bonus)',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
          }}
        >
          Compte créé pour <strong>{createdPlayer.username}</strong>. Le joueur peut maintenant se connecter.
        </div>
      )}

      {serverError && (
        <div
          data-testid="admin-error-message"
          style={{
            background: 'var(--color-malus-bg)',
            border: '1px solid var(--color-malus)',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            color: 'var(--color-malus)',
          }}
        >
          {serverError}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
        <form.Field name="username">
          {(field) => (
            <div style={{ marginBottom: '1rem' }}>
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input
                id="username"
                data-testid="admin-username-input"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="nom_joueur"
                style={{ marginTop: '0.25rem' }}
              />
              {field.state.meta.errors.length > 0 && (
                <p style={{ color: 'var(--color-malus)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {typeof field.state.meta.errors[0] === 'string'
                    ? field.state.meta.errors[0]
                    : (field.state.meta.errors[0] as { message: string } | undefined)?.message}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="tempPassword">
          {(field) => (
            <div style={{ marginBottom: '1.5rem' }}>
              <Label htmlFor="tempPassword">Mot de passe temporaire</Label>
              <Input
                id="tempPassword"
                type="password"
                data-testid="admin-password-input"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="Minimum 6 caractères"
                style={{ marginTop: '0.25rem' }}
              />
              {field.state.meta.errors.length > 0 && (
                <p style={{ color: 'var(--color-malus)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {typeof field.state.meta.errors[0] === 'string'
                    ? field.state.meta.errors[0]
                    : (field.state.meta.errors[0] as { message: string } | undefined)?.message}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <Button
          type="submit"
          data-testid="admin-create-player-button"
          style={{ background: 'var(--color-brand)', color: 'white', width: '100%' }}
        >
          Créer le compte
        </Button>
      </form>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
          Joueurs
        </h2>

        {(deleteError || playersQuery.error) && (
          <div
            style={{
              background: 'var(--color-malus-bg)',
              border: '1px solid var(--color-malus)',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              color: 'var(--color-malus)',
            }}
          >
            {[playersQuery.error ? 'Impossible de charger la liste des joueurs' : null, deleteError].filter(Boolean).join(' — ')}
          </div>
        )}

        {playersQuery.isPending ? (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Chargement…</p>
        ) : <div>
          {(playersQuery.data ?? []).map((player) => (
            <div
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <span style={{ fontWeight: 600, fontFamily: 'monospace', minWidth: '8rem' }}>
                {player.username}
              </span>
              <span style={{ color: 'var(--color-text-secondary)', flex: 1 }}>
                {player.displayName || '—'}
              </span>
              {player.isAdmin && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.25rem',
                    background: 'var(--color-brand)',
                    color: 'white',
                  }}
                >
                  Admin
                </span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                {new Date(player.createdAt).toLocaleDateString('fr-FR')}
              </span>
              {player.id !== session?.playerId && (
                <button
                  data-testid={`delete-player-${player.id}`}
                  onClick={() => handleDelete(player.id, player.username)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--color-malus)',
                    color: 'var(--color-malus)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                >
                  Supprimer
                </button>
              )}
            </div>
          ))}
        </div>}
      </section>

      {/* Story 2.1 — Import OWB army */}
      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
          Importer une armée OWB
        </h2>

        <textarea
          data-testid="owb-import-textarea"
          value={owbText}
          onChange={(e) => setOwbText(e.target.value)}
          disabled={importSubmitting}
          placeholder="Coller ici l'export texte Old World Builder…"
          rows={6}
          style={{
            width: '100%',
            padding: '0.625rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--color-border)',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            resize: 'vertical',
            background: 'var(--color-surface)',
            boxSizing: 'border-box',
          }}
        />

        <button
          data-testid="owb-import-submit"
          onClick={handleImport}
          disabled={importSubmitting || !owbText.trim()}
          style={{ ...btnStyle, marginTop: '0.75rem', opacity: importSubmitting ? 0.6 : 1 }}
        >
          {importSubmitting ? 'Import en cours…' : 'Importer'}
        </button>

        {importResult && (
          <p
            data-testid="import-result-message"
            style={{
              marginTop: '0.75rem',
              padding: '0.625rem',
              borderRadius: '0.375rem',
              background: importResult.success ? 'var(--color-bonus-bg)' : 'var(--color-malus-bg)',
              color: importResult.success ? 'var(--color-bonus)' : 'var(--color-malus)',
              border: `1px solid ${importResult.success ? 'var(--color-bonus)' : 'var(--color-malus)'}`,
              fontSize: '0.875rem',
            }}
          >
            {importResult.message}
          </p>
        )}
      </section>

      {/* Story 2.1 — Army list with player assignment */}
      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
          Armées
        </h2>

        {armiesQuery.error && (
          <div
            style={{
              background: 'var(--color-malus-bg)',
              border: '1px solid var(--color-malus)',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              color: 'var(--color-malus)',
            }}
          >
            Impossible de charger la liste des armées
          </div>
        )}

        {assignResult && (
          <p
            data-testid="assign-result-message"
            style={{
              marginBottom: '1rem',
              padding: '0.625rem',
              borderRadius: '0.375rem',
              background: assignResult.success ? 'var(--color-bonus-bg)' : 'var(--color-malus-bg)',
              color: assignResult.success ? 'var(--color-bonus)' : 'var(--color-malus)',
              border: `1px solid ${assignResult.success ? 'var(--color-bonus)' : 'var(--color-malus)'}`,
              fontSize: '0.875rem',
            }}
          >
            {assignResult.message}
          </p>
        )}

        {armiesQuery.isPending ? (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Chargement…</p>
        ) : (
          <div data-testid="army-list">
            {(armiesQuery.data ?? []).length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                Aucune armée importée.
              </p>
            ) : (
              (armiesQuery.data ?? []).map((army) => (
                <div
                  key={army.id}
                  data-testid={`army-row-${army.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: '0.9rem', flex: '0 0 auto' }}>
                    {army.name}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', flex: '0 0 auto' }}>
                    {army.faction}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', flex: '0 0 auto' }}>
                    {army.playerDisplayName ?? 'Non assignée'}
                  </span>
                  <select
                    role="combobox"
                    value={selectedPlayers[army.id] ?? army.playerId ?? ''}
                    onChange={(e) =>
                      setSelectedPlayers((prev) => ({ ...prev, [army.id]: e.target.value }))
                    }
                    style={{
                      padding: '0.25rem 0.375rem',
                      borderRadius: '0.25rem',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.8rem',
                      flex: '1 1 120px',
                      maxWidth: '160px',
                    }}
                  >
                    <option value="">— Choisir un joueur —</option>
                    {(playersQuery.data ?? []).map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.displayName || player.username}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAssign(army.id)}
                    disabled={assigningArmyId === army.id || !selectedPlayers[army.id]}
                    style={{
                      ...btnStyle,
                      opacity: assigningArmyId === army.id || !selectedPlayers[army.id] ? 0.5 : 1,
                    }}
                  >
                    Assigner
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </section>
      {/* Story 3.1 — Create match (admin only) */}
      {session?.isAdmin && <CreateMatchSection
        armies={armiesQuery.data ?? []}
        army1Id={matchArmy1Id}
        setArmy1Id={setMatchArmy1Id}
        result1={matchResult1}
        setResult1={setMatchResult1}
        army2Id={matchArmy2Id}
        setArmy2Id={setMatchArmy2Id}
        result2={matchResult2}
        setResult2={setMatchResult2}
        date={matchDate}
        setDate={setMatchDate}
        evolutionsEntered={matchEvolutions}
        setEvolutionsEntered={setMatchEvolutions}
        result={matchResult}
        submitting={matchSubmitting}
        onSubmit={handleCreateMatch}
        btnStyle={btnStyle}
      />}

      {/* Story 2.2 — Add unit form (admin only) */}
      {session?.isAdmin && <AddUnitSection
        armies={armiesQuery.data ?? []}
        armyId={addUnitArmyId}
        setArmyId={setAddUnitArmyId}
        name={addUnitName}
        setName={setAddUnitName}
        type={addUnitType}
        setType={setAddUnitType}
        stats={addUnitStats}
        setStats={setAddUnitStats}
        result={addUnitResult}
        submitting={addUnitSubmitting}
        onSubmit={handleAddUnit}
        btnStyle={btnStyle}
      />}

      {/* Story 2.2 — Correction form (admin only) */}
      {session?.isAdmin && <CorrectionSection
        armies={armiesQuery.data ?? []}
        armyId={corrArmyId}
        setArmyId={(id) => {
          setCorrArmyId(id)
          setCorrUnitId('')
          setCorrSubProfileId('')
          setCorrStats({ m: '', cc: '', ct: '', f: '', e: '', pv: '', i: '', a: '', cd: '' })
          setCorrResult(null)
        }}
        units={corrUnits}
        unitId={corrUnitId}
        setUnitId={(id) => {
          setCorrUnitId(id)
          setCorrSubProfileId('')
          setCorrStats({ m: '', cc: '', ct: '', f: '', e: '', pv: '', i: '', a: '', cd: '' })
          // If unit has exactly 1 sub-profile, auto-select
          const unit = corrUnits.find((u) => u.id === id)
          if (unit && unit.subProfiles.length === 1) {
            const sp = unit.subProfiles[0]
            setCorrSubProfileId(sp.id)
            setCorrStats({
              m: sp.m ?? '',
              cc: sp.cc ?? '',
              ct: sp.ct ?? '',
              f: sp.f ?? '',
              e: sp.e ?? '',
              pv: sp.pv ?? '',
              i: sp.i ?? '',
              a: sp.a ?? '',
              cd: sp.cd ?? '',
            })
          }
        }}
        subProfiles={corrSubProfiles}
        subProfileId={corrSubProfileId}
        setSubProfileId={(id) => {
          setCorrSubProfileId(id)
          const sp = corrSubProfiles.find((s) => s.id === id)
          if (sp) {
            setCorrStats({
              m: sp.m ?? '',
              cc: sp.cc ?? '',
              ct: sp.ct ?? '',
              f: sp.f ?? '',
              e: sp.e ?? '',
              pv: sp.pv ?? '',
              i: sp.i ?? '',
              a: sp.a ?? '',
              cd: sp.cd ?? '',
            })
          }
        }}
        stats={corrStats}
        setStats={setCorrStats}
        result={corrResult}
        submitting={corrSubmitting}
        onSubmit={handleCorrectStats}
        btnStyle={btnStyle}
        unitsLoading={armyUnitsQuery.isPending && !!corrArmyId}
        unitsError={!!armyUnitsQuery.error}
      />}
    </main>
  )
}

// Story 3.1 — Create Match Section component
const RESULT_OPTIONS: { value: 'victory' | 'defeat' | 'draw' | ''; label: string }[] = [
  { value: '', label: '— Résultat non saisi —' },
  { value: 'victory', label: 'Victoire' },
  { value: 'defeat', label: 'Défaite' },
  { value: 'draw', label: 'Égalité' },
]

function CreateMatchSection({
  armies, army1Id, setArmy1Id, result1, setResult1,
  army2Id, setArmy2Id, result2, setResult2,
  date, setDate, evolutionsEntered, setEvolutionsEntered,
  result, submitting, onSubmit, btnStyle,
}: {
  armies: ArmyOption[]
  army1Id: string; setArmy1Id: (v: string) => void
  result1: 'victory' | 'defeat' | 'draw' | ''; setResult1: (v: 'victory' | 'defeat' | 'draw' | '') => void
  army2Id: string; setArmy2Id: (v: string) => void
  result2: 'victory' | 'defeat' | 'draw' | ''; setResult2: (v: 'victory' | 'defeat' | 'draw' | '') => void
  date: string; setDate: (v: string) => void
  evolutionsEntered: boolean; setEvolutionsEntered: (v: boolean) => void
  result: { success: boolean; message: string } | null
  submitting: boolean
  onSubmit: () => void
  btnStyle: React.CSSProperties
}) {
  const canSubmit = !!army1Id && !!army2Id && army1Id !== army2Id && !!date && !submitting

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '0.375rem', borderRadius: '0.25rem',
    border: '1px solid var(--color-border)', fontSize: '0.875rem',
    background: 'var(--color-surface)',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem',
  }
  const rowStyle: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem',
  }

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        Créer une partie
      </h2>

      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Armée 1</label>
          <select value={army1Id} onChange={(e) => setArmy1Id(e.target.value)} style={selectStyle}>
            <option value="">— Choisir —</option>
            {armies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Résultat armée 1</label>
          <select value={result1} onChange={(e) => setResult1(e.target.value as typeof result1)} style={selectStyle}>
            {RESULT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Armée 2</label>
          <select value={army2Id} onChange={(e) => setArmy2Id(e.target.value)} style={selectStyle}>
            <option value="">— Choisir —</option>
            {armies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Résultat armée 2</label>
          <select value={result2} onChange={(e) => setResult2(e.target.value as typeof result2)} style={selectStyle}>
            {RESULT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {army1Id && army2Id && army1Id === army2Id && (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-malus)', marginBottom: '0.75rem' }}>
          Les deux armées doivent être différentes.
        </p>
      )}

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Date de la partie</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ ...selectStyle, width: 'auto' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="checkbox"
          id="evolutions-entered"
          checked={evolutionsEntered}
          onChange={(e) => setEvolutionsEntered(e.target.checked)}
        />
        <label htmlFor="evolutions-entered" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
          Évolutions déjà saisies
        </label>
      </div>

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{ ...btnStyle, opacity: canSubmit ? 1 : 0.5 }}
      >
        {submitting ? 'Création…' : 'Créer la partie'}
      </button>

      {result && (
        <p style={{
          marginTop: '0.75rem', padding: '0.625rem', borderRadius: '0.375rem',
          background: result.success ? 'var(--color-bonus-bg)' : 'var(--color-malus-bg)',
          color: result.success ? 'var(--color-bonus)' : 'var(--color-malus)',
          border: `1px solid ${result.success ? 'var(--color-bonus)' : 'var(--color-malus)'}`,
          fontSize: '0.875rem',
        }}>
          {result.message}
        </p>
      )}
    </section>
  )
}

// Story 2.2 — Shared stat field grid component
type StatFields = { m: string; cc: string; ct: string; f: string; e: string; pv: string; i: string; a: string; cd: string }
const STAT_KEYS: (keyof StatFields)[] = ['m', 'cc', 'ct', 'f', 'e', 'pv', 'i', 'a', 'cd']

function StatFieldsGrid({ stats, setStats }: { stats: StatFields; setStats: (s: StatFields) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
      {STAT_KEYS.map((key) => (
        <div key={key}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.125rem' }}>
            {key.toUpperCase()}
          </label>
          <input
            type="text"
            value={stats[key]}
            onChange={(e) => setStats({ ...stats, [key]: e.target.value })}
            placeholder="—"
            style={{
              width: '100%',
              padding: '0.25rem 0.375rem',
              borderRadius: '0.25rem',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
              background: 'var(--color-surface)',
              boxSizing: 'border-box',
            }}
          />
        </div>
      ))}
    </div>
  )
}

// Story 2.2 — Add Unit Section component
type ArmyOption = { id: string; name: string; faction: string }

function AddUnitSection({
  armies, armyId, setArmyId, name, setName, type, setType, stats, setStats,
  result, submitting, onSubmit, btnStyle
}: {
  armies: ArmyOption[]
  armyId: string; setArmyId: (v: string) => void
  name: string; setName: (v: string) => void
  type: string; setType: (v: string) => void
  stats: StatFields; setStats: (s: StatFields) => void
  result: { success: boolean; message: string } | null
  submitting: boolean
  onSubmit: () => void
  btnStyle: React.CSSProperties
}) {
  const canSubmit = !!armyId && !!name.trim() && !!type && !submitting
  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        Ajouter une unité
      </h2>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
          Armée
        </label>
        <select
          value={armyId}
          onChange={(e) => setArmyId(e.target.value)}
          style={{ width: '100%', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-surface)' }}
        >
          <option value="">— Choisir une armée —</option>
          {armies.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.faction})</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
          Nom de l'unité
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de l'unité"
          style={{ width: '100%', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-surface)', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
          Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ width: '100%', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-surface)' }}
        >
          <option value="">— Choisir un type —</option>
          <option value="Personnages">Personnages</option>
          <option value="Unités de base">Unités de base</option>
          <option value="Unités spéciales">Unités spéciales</option>
          <option value="Unités rares">Unités rares</option>
        </select>
      </div>

      <StatFieldsGrid stats={stats} setStats={setStats} />

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{ ...btnStyle, opacity: canSubmit ? 1 : 0.5 }}
      >
        {submitting ? 'Ajout en cours…' : 'Ajouter l\'unité'}
      </button>

      {result && (
        <p style={{
          marginTop: '0.75rem',
          padding: '0.625rem',
          borderRadius: '0.375rem',
          background: result.success ? 'var(--color-bonus-bg)' : 'var(--color-malus-bg)',
          color: result.success ? 'var(--color-bonus)' : 'var(--color-malus)',
          border: `1px solid ${result.success ? 'var(--color-bonus)' : 'var(--color-malus)'}`,
          fontSize: '0.875rem',
        }}>
          {result.message}
        </p>
      )}
    </section>
  )
}

// Story 2.2 — Correction Section component
type SubProfileOption = { id: string; label: string; m: string | null; cc: string | null; ct: string | null; f: string | null; e: string | null; pv: string | null; i: string | null; a: string | null; cd: string | null }
type UnitWithSubProfiles = { id: string; name: string; subProfiles: SubProfileOption[] }

function CorrectionSection({
  armies, armyId, setArmyId, units, unitId, setUnitId,
  subProfiles, subProfileId, setSubProfileId, stats, setStats,
  result, submitting, onSubmit, btnStyle, unitsLoading, unitsError,
}: {
  armies: ArmyOption[]
  armyId: string; setArmyId: (v: string) => void
  units: UnitWithSubProfiles[]
  unitId: string; setUnitId: (v: string) => void
  subProfiles: SubProfileOption[]
  subProfileId: string; setSubProfileId: (v: string) => void
  stats: StatFields; setStats: (s: StatFields) => void
  result: { success: boolean; message: string } | null
  submitting: boolean
  onSubmit: () => void
  btnStyle: React.CSSProperties
  unitsLoading: boolean
  unitsError: boolean
}) {
  const selectedUnit = units.find((u) => u.id === unitId)
  const hasMultipleSubProfiles = (selectedUnit?.subProfiles.length ?? 0) > 1
  const hasNoSubProfiles = selectedUnit && selectedUnit.subProfiles.length === 0
  const canSubmit = !!subProfileId && !submitting

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        Corriger les stats
      </h2>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
          Armée
        </label>
        <select
          value={armyId}
          onChange={(e) => setArmyId(e.target.value)}
          style={{ width: '100%', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-surface)' }}
        >
          <option value="">— Choisir une armée —</option>
          {armies.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.faction})</option>
          ))}
        </select>
      </div>

      {armyId && (
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            Unité
          </label>
          {unitsLoading ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Chargement des unités…</p>
          ) : unitsError ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-malus)' }}>Impossible de charger les unités</p>
          ) : units.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Aucune unité dans cette armée</p>
          ) : (
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              style={{ width: '100%', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-surface)' }}
            >
              <option value="">— Choisir une unité —</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {unitId && hasMultipleSubProfiles && (
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            Sous-profil
          </label>
          <select
            value={subProfileId}
            onChange={(e) => setSubProfileId(e.target.value)}
            style={{ width: '100%', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-surface)' }}
          >
            <option value="">— Choisir un sous-profil —</option>
            {subProfiles.map((sp) => (
              <option key={sp.id} value={sp.id}>{sp.label}</option>
            ))}
          </select>
        </div>
      )}

      {unitId && hasNoSubProfiles && (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
          Aucun sous-profil
        </p>
      )}

      {subProfileId && (
        <>
          <StatFieldsGrid stats={stats} setStats={setStats} />
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            style={{ ...btnStyle, opacity: canSubmit ? 1 : 0.5 }}
          >
            {submitting ? 'Mise à jour…' : 'Mettre à jour les stats'}
          </button>
        </>
      )}

      {result && (
        <p style={{
          marginTop: '0.75rem',
          padding: '0.625rem',
          borderRadius: '0.375rem',
          background: result.success ? 'var(--color-bonus-bg)' : 'var(--color-malus-bg)',
          color: result.success ? 'var(--color-bonus)' : 'var(--color-malus)',
          border: `1px solid ${result.success ? 'var(--color-bonus)' : 'var(--color-malus)'}`,
          fontSize: '0.875rem',
        }}>
          {result.message}
        </p>
      )}
    </section>
  )
}
