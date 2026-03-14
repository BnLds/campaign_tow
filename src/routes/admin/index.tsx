import { useForm } from '@tanstack/react-form'
import { createFileRoute, redirect, useRouteContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { adminMiddleware } from '../../lib/middleware'
import type { ServerResult } from '../../lib/types'
import { createPlayerSchema, importArmySchema, assignArmySchema } from '../../lib/validators'
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
    </main>
  )
}
