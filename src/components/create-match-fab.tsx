// Campaign TOW — CreateMatchFab component
// Story 3.2: Floating action button for match creation.
// Co-locates server functions (loadOpponentsFn, createMatchFn) per story dev notes.

import { useState, useEffect, useRef } from 'react'
import { useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '../lib/middleware'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ---------------------------------------------------------------------------
// Server function: loadOpponentsFn — fetches opponent list for match creation
// ---------------------------------------------------------------------------

export const loadOpponentsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    // H2 — Reject guest users
    if (context.session.isGuest) throw new Error('UNAUTHORIZED')

    const { getAllArmies } = await import('../db/queries')
    const allArmies = await getAllArmies()

    // L3 — Find own army in-memory using playerId (no extra DB call)
    const myArmyId = allArmies.find((a) => a.playerId === context.session.playerId)?.id

    return allArmies
      .filter((army) => army.playerId !== null && army.playerId !== context.session.playerId && army.id !== myArmyId)
      .map((army) => ({
        armyId: army.id,
        armyName: army.name,
        faction: army.faction,
        playerDisplayName: army.playerDisplayName ?? '',
      }))
  })

// ---------------------------------------------------------------------------
// Server function: createMatchFn — creates a new match between two armies
// ---------------------------------------------------------------------------

export const createMatchFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(z.object({ opponentArmyId: z.string(), date: z.string().optional() }))
  .handler(async ({ context, data }) => {
    const { session } = context

    // AC9 — Reject guest users
    if (session.isGuest) {
      throw new Error('UNAUTHORIZED')
    }

    const { getPlayerArmy, getArmyById, createMatchWithParticipants } = await import('../db/queries')

    // AC10 — Reject players without army
    const playerArmy = await getPlayerArmy(session.playerId)
    if (!playerArmy) {
      throw new Error('Vous devez avoir une armee pour creer une partie')
    }

    // AC8 — Reject self-match
    if (data.opponentArmyId === playerArmy.id) {
      throw new Error('Vous ne pouvez pas jouer contre votre propre armee')
    }

    // AC8 — Validate opponent army exists in DB
    const opponentArmy = await getArmyById(data.opponentArmyId)
    if (!opponentArmy) {
      throw new Error("L'armee adverse n'existe pas")
    }

    // M2 — Validate opponent army has an assigned player (not orphan)
    if (!opponentArmy.playerId) {
      throw new Error("L'armee adverse n'est assignee a aucun joueur")
    }

    // AC3 — Parse and validate date, normalize to midnight UTC
    const matchDate = data.date
      ? new Date(data.date + 'T00:00:00Z')
      : new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z')

    if (isNaN(matchDate.getTime())) {
      throw new Error('Date invalide')
    }

    // AC4 — Create match + 2 participants in transaction
    const { matchId } = await createMatchWithParticipants({
      army1Id: playerArmy.id,
      result1: null,
      army2Id: data.opponentArmyId,
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
  armyId: string
  armyName: string
  faction: string
  playerDisplayName: string
}

// ---------------------------------------------------------------------------
// CreateMatchFab component
// ---------------------------------------------------------------------------

export function CreateMatchFab({ session: _session, armyId }: CreateMatchFabProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [noArmyMessage, setNoArmyMessage] = useState(false)
  const noArmyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dialog state
  const [opponents, setOpponents] = useState<OpponentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Fetch opponents when dialog opens; reset state when dialog closes
  useEffect(() => {
    if (!open) {
      // H1 — reset isSubmitting when dialog is closed/reopened
      setIsSubmitting(false)
      return
    }
    // M5 — reset date to today when dialog opens
    setDate(new Date().toISOString().split('T')[0])
    setIsLoading(true)
    setLoadError(null)
    setSelectedOpponent(null)
    setSubmitError(null)

    loadOpponentsFn()
      .then((data) => {
        setOpponents(data)
        setIsLoading(false)
      })
      .catch(() => {
        setLoadError('Impossible de charger la liste des adversaires.')
        setIsLoading(false)
      })
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
    setIsLoading(true)
    setLoadError(null)
    loadOpponentsFn()
      .then((data) => {
        setOpponents(data)
        setIsLoading(false)
      })
      .catch(() => {
        setLoadError('Impossible de charger la liste des adversaires.')
        setIsLoading(false)
      })
  }

  const handleConfirm = async () => {
    if (!selectedOpponent || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await createMatchFn({ data: { opponentArmyId: selectedOpponent, date } })
      setOpen(false)
      setSelectedOpponent(null)
      // H1 — reset isSubmitting on success path (finally will also run but setOpen triggers useEffect reset)
      setIsSubmitting(false)
      router.invalidate()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur lors de la creation de la partie.')
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
          Vous devez avoir une armee pour creer une partie
        </div>
      )}

      {/* FAB button */}
      <button
        data-testid="create-match-fab"
        aria-label="Creer une partie"
        onClick={handleFabClick}
        style={{
          position: 'absolute',
          right: 16,
          bottom: 62,
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
              Choisir un adversaire et une date pour creer une nouvelle partie
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
                  {loadError}
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
                  Reessayer
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
                    key={opponent.armyId}
                    onClick={() => setSelectedOpponent(opponent.armyId)}
                    style={{
                      textAlign: 'left',
                      background: selectedOpponent === opponent.armyId ? '#eef4ff' : '#fffbf5',
                      border: selectedOpponent === opponent.armyId ? '2px solid #2a5ab8' : '1px solid #e0d5c8',
                      borderRadius: 8,
                      padding: '10px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    {/* armyName displayed with Cinzel (font-display) for army name */}
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
                      {opponent.armyName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {opponent.faction} — {opponent.playerDisplayName}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date input */}
          <div>
            <label
              htmlFor="match-date"
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: 4 }}
            >
              Date de la partie
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

          {/* Submit error */}
          {submitError && (
            <p style={{ color: 'var(--color-malus)', fontSize: 13, margin: 0 }}>
              {submitError}
            </p>
          )}

          {/* Confirm button — disabled until opponent is selected */}
          <button
            onClick={handleConfirm}
            disabled={!selectedOpponent || isSubmitting} // disabled when no opponent selected
            style={{
              background: !selectedOpponent || isSubmitting ? '#94a3b8' : '#334155',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              minHeight: 44,
              fontSize: 15,
              fontWeight: 700,
              cursor: !selectedOpponent || isSubmitting ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {isSubmitting ? 'Creation en cours...' : 'Creer la partie'}
          </button>
        </DialogContent>
      </Dialog>
    </>
  )
}
