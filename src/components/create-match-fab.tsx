// Campaign TOW — CreateMatchFab component
// Story 3.2: Floating action button for match creation.
// Co-locates server functions (loadOpponentsFn, createMatchFn) per story dev notes.
// Player-first: select an opponent player, not an army.

import { useState, useEffect, useRef } from 'react'
import { FAB_BOTTOM } from '../lib/layout-constants'
import { useRouter } from '@tanstack/react-router'
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '../lib/middleware'
import { STALE_TIME_SESSION } from '../lib/query-constants'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ---------------------------------------------------------------------------
// Query options: opponents list
// ---------------------------------------------------------------------------

const opponentsQueryOptions = () =>
  queryOptions({
    queryKey: ['opponents'],
    queryFn: () => loadOpponentsFn(),
    staleTime: STALE_TIME_SESSION,
  })

// ---------------------------------------------------------------------------
// Server function: loadOpponentsFn — fetches opponent player list for match creation
// ---------------------------------------------------------------------------

export const loadOpponentsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    // H2 — Reject guest users
    if (context.session.isGuest) throw new Error('UNAUTHORIZED')

    const { getAllPlayersWithArmyInfo } = await import('../db/queries')
    const allPlayers = await getAllPlayersWithArmyInfo()

    return allPlayers
      .filter((p) => p.playerId !== context.session.playerId)
      .map((p) => ({
        playerId: p.playerId,
        playerUsername: p.username,
        armyId: p.armyId,
        armyName: p.armyName,
        faction: p.faction,
        hasArmy: p.armyId !== null,
      }))
  })

// ---------------------------------------------------------------------------
// Server function: createMatchFn — creates a new match between two players
// ---------------------------------------------------------------------------

export const createMatchFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(z.object({ opponentPlayerId: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/) }))
  .handler(async ({ context, data }) => {
    const { session } = context

    // AC9 — Reject guest users
    if (session.isGuest) {
      throw new Error('UNAUTHORIZED')
    }

    const { getPlayerArmy, createMatchWithParticipants } = await import('../db/queries')

    // AC10 — Reject players without army
    const playerArmy = await getPlayerArmy(session.playerId)
    if (!playerArmy) {
      throw new Error('Vous devez avoir une armée pour créer une partie')
    }

    // AC8 — Reject self-match
    if (data.opponentPlayerId === session.playerId) {
      throw new Error('Vous ne pouvez pas jouer contre vous-même')
    }

    // Validate opponent player exists, lookup their army (may be null)
    const { getPlayerById } = await import('../db/queries')
    const opponentPlayer = await getPlayerById(data.opponentPlayerId)
    if (!opponentPlayer) {
      throw new Error("Le joueur adverse n'existe pas")
    }
    const opponentArmy = await getPlayerArmy(data.opponentPlayerId)

    // AC3 — Parse and validate date + time (Paris wall-clock stored as UTC)
    const matchDate = new Date(`${data.date}T${data.time}:00Z`)

    if (isNaN(matchDate.getTime())) {
      throw new Error('Date invalide')
    }

    // AC4 — Create match + 2 participants in transaction
    const { matchId } = await createMatchWithParticipants({
      player1Id: session.playerId,
      army1Id: playerArmy.id,
      result1: null,
      player2Id: data.opponentPlayerId,
      army2Id: opponentArmy?.id ?? null,
      result2: null,
      matchDate,
      evolutionsEntered: false,
      createdByPlayerId: session.playerId,
    })

    return { matchId }
  })

// ---------------------------------------------------------------------------
// CreateMatchFab component props
// ---------------------------------------------------------------------------

type CreateMatchFabProps = {
  session: { playerId: string; isGuest: boolean }
  armyId: string | null
}

type OpponentItem = {
  playerId: string
  playerUsername: string
  armyName: string | null
  faction: string | null
  hasArmy: boolean
}

// ---------------------------------------------------------------------------
// CreateMatchFab component
// ---------------------------------------------------------------------------

export function CreateMatchFab({ session: _session, armyId }: CreateMatchFabProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [noArmyMessage, setNoArmyMessage] = useState(false)
  const noArmyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dialog state
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    data: opponents = [] as OpponentItem[],
    isLoading,
    error: loadError,
    refetch: retryOpponents,
  } = useQuery({
    ...opponentsQueryOptions(),
    enabled: open, // fetch uniquement quand le dialog est ouvert
  })

  // Reset dialog state when it opens/closes; no fetch needed (handled by useQuery)
  useEffect(() => {
    if (!open) {
      // H1 — reset isSubmitting when dialog is closed/reopened
      setIsSubmitting(false)
      return
    }
    // M5 — reset date to today and time to now when dialog opens
    setDate(new Date().toISOString().split('T')[0])
    const now = new Date()
    setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    setSelectedOpponent(null)
    setSubmitError(null)
  }, [open])

  // M3 — cleanup no-army toast timeout on unmount
  useEffect(() => {
    return () => {
      if (noArmyTimeoutRef.current) clearTimeout(noArmyTimeoutRef.current)
    }
  }, [])

  const handleFabClick = () => {
    if (!armyId) {
      setNoArmyMessage(true)
      // M3 — store timeout id for cleanup
      if (noArmyTimeoutRef.current) clearTimeout(noArmyTimeoutRef.current)
      noArmyTimeoutRef.current = setTimeout(() => setNoArmyMessage(false), 3000)
      return
    }
    setOpen(true)
  }

  const handleRetry = () => {
    retryOpponents()
  }

  const handleConfirm = async () => {
    if (!selectedOpponent || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await createMatchFn({ data: { opponentPlayerId: selectedOpponent, date, time } })
      setOpen(false)
      setSelectedOpponent(null)
      // H1 — reset isSubmitting on success path (finally will also run but setOpen triggers useEffect reset)
      setIsSubmitting(false)
      queryClient.invalidateQueries({ queryKey: ['opponents'] })
      queryClient.invalidateQueries({ queryKey: ['session'] })
      queryClient.invalidateQueries({ queryKey: ['army-info'] })
      await router.invalidate({ filter: (d) => d.routeId === '/' })
      await router.navigate({ to: '/' })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur lors de la création de la partie.')
    } finally {
      // H1 — ensure isSubmitting is always reset (covers both success and error paths)
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* No-army inline message */}
      {noArmyMessage && (
        <div
          style={{
            position: 'absolute',
            bottom: 130,
            right: 16,
            background: '#1e293b',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            zIndex: 3,
            maxWidth: 260,
            textAlign: 'right',
          }}
        >
          Vous devez avoir une armée pour créer une partie
        </div>
      )}

      {/* FAB button */}
      <button
        data-testid="create-match-fab"
        aria-label="Créer une partie"
        onClick={handleFabClick}
        style={{
          position: 'absolute',
          right: 16,
          bottom: FAB_BOTTOM,
          zIndex: 2,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#334155',
          color: '#fff',
          fontSize: 24,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
        }}
      >
        +
      </button>

      {/* Match creation dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
              }}
            >
              Nouvelle partie
            </DialogTitle>
            <DialogDescription className="sr-only">
              Choisir un adversaire et une date pour créer une nouvelle partie
            </DialogDescription>
          </DialogHeader>

          {/* Opponent list */}
          <div>
            {isLoading ? (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
                Chargement des adversaires…
              </p>
            ) : loadError ? (
              <div>
                <p style={{ color: 'var(--color-malus)', fontSize: 14, marginBottom: 8 }}>
                  Impossible de charger la liste des adversaires.
                </p>
                <button
                  onClick={handleRetry}
                  style={{
                    background: 'none',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    color: '#334155',
                    fontSize: 13,
                  }}
                >
                  Réessayer
                </button>
              </div>
            ) : opponents.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, fontStyle: 'italic' }}>
                Aucun adversaire disponible
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                {opponents.map((opponent) => (
                  <button
                    key={opponent.playerId}
                    onClick={() => setSelectedOpponent(opponent.playerId)}
                    style={{
                      textAlign: 'left',
                      background: selectedOpponent === opponent.playerId ? '#eef4ff' : '#fffbf5',
                      border: selectedOpponent === opponent.playerId ? '2px solid #2a5ab8' : '1px solid #e0d5c8',
                      borderRadius: 8,
                      padding: '10px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    {/* playerUsername displayed with Cinzel (font-display) */}
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
                      {opponent.playerUsername}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {opponent.hasArmy
                        ? `${opponent.armyName} — ${opponent.faction}`
                        : 'Armée non attribuée'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date + time inputs */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="match-date"
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: 4 }}
              >
                Date
              </label>
              <input
                id="match-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid #e0d5c8',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 14,
                  color: 'var(--color-text-primary)',
                  background: '#fffbf5',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="match-time"
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: 4 }}
              >
                Heure
              </label>
              <input
                id="match-time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid #e0d5c8',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 14,
                  color: 'var(--color-text-primary)',
                  background: '#fffbf5',
                }}
              />
            </div>
          </div>

          {/* Submit error */}
          {submitError && (
            <p style={{ color: 'var(--color-malus)', fontSize: 13, margin: 0 }}>
              {submitError}
            </p>
          )}

          {/* Confirm button — disabled until opponent is selected */}
          <button
            onClick={handleConfirm}
            disabled={!selectedOpponent || isSubmitting || isLoading} // disabled when no opponent selected, loading, or submitting
            style={{
              background: !selectedOpponent || isSubmitting || isLoading ? '#94a3b8' : '#334155',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              minHeight: 44,
              fontSize: 15,
              fontWeight: 700,
              cursor: !selectedOpponent || isSubmitting || isLoading ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {isSubmitting ? 'Création en cours...' : 'Créer la partie'}
          </button>
        </DialogContent>
      </Dialog>
    </>
  )
}
