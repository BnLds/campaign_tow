// Campaign TOW — CreateMatchFab component
// Story 3.2: Floating action button for match creation.
// Co-locates server functions (loadOpponentsFn, createMatchFn) per story dev notes.
// Player-first: select an opponent player, not an army.

import { useState, useEffect, useRef } from 'react'
import { FabBlockerMessage } from './fab-blocker-message'
import { FAB_BOTTOM } from '../lib/layout-constants'
import { useRouter } from '@tanstack/react-router'
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '../lib/middleware'
import { STALE_TIME_SESSION } from '../lib/query-constants'
import { invalidateArmyState } from '../lib/invalidation-helpers'
import { invariant } from '../lib/invariant'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '#/lib/utils'

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
  .validator(z.object({ opponentPlayerId: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/) }))
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

    // Reject players who haven't completed initial XP
    if (!playerArmy.initialXpCompletedAt) {
      throw new Error("Complétez d'abord l'XP initiale de votre armée")
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
// Server function: checkDuplicateMatchFn — checks if a match already exists between two players on a given date
// ---------------------------------------------------------------------------

export const checkDuplicateMatchFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ opponentPlayerId: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .handler(async ({ context, data }) => {
    if (context.session.isGuest) throw new Error('UNAUTHORIZED')
    const { checkDuplicateMatch } = await import('../db/queries')
    const isDuplicate = await checkDuplicateMatch(context.session.playerId, data.opponentPlayerId, data.date)
    return { isDuplicate }
  })

// ---------------------------------------------------------------------------
// CreateMatchFab component props
// ---------------------------------------------------------------------------

type CreateMatchFabProps = {
  session: { playerId: string; isGuest: boolean }
  armyId: string | null
  initialXpCompleted: boolean
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

export function CreateMatchFab({ session: _session, armyId, initialXpCompleted }: CreateMatchFabProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [noArmyMessage, setNoArmyMessage] = useState(false)
  const noArmyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [noXpMessage, setNoXpMessage] = useState(false)
  const noXpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dialog state
  const [searchFilter, setSearchFilter] = useState('')
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null)
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0] ?? '')
  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false)

  const {
    data: opponents = [] as OpponentItem[],
    isLoading,
    error: loadError,
    refetch: retryOpponents,
  } = useQuery({
    ...opponentsQueryOptions(),
    enabled: open, // fetch uniquement quand le dialog est ouvert
  })

  const filteredOpponents = opponents.filter((o) =>
    o.playerUsername.toLowerCase().includes(searchFilter.toLowerCase())
  )

  // Reset dialog state when it opens/closes; no fetch needed (handled by useQuery)
  useEffect(() => {
    if (!open) {
      // H1 — reset isSubmitting when dialog is closed/reopened
      setIsSubmitting(false)
      setSearchFilter('')
      setDuplicateConfirmOpen(false)
      return
    }
    // M5 — reset date to today and time to now when dialog opens
    setDate(new Date().toISOString().split('T')[0] ?? '')
    const now = new Date()
    setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    setSelectedOpponent(null)
    setSubmitError(null)
    setSearchFilter('')
  }, [open])

  // M3 — cleanup no-army toast timeout on unmount
  useEffect(() => {
    return () => {
      if (noArmyTimeoutRef.current) clearTimeout(noArmyTimeoutRef.current)
      if (noXpTimeoutRef.current) clearTimeout(noXpTimeoutRef.current)
    }
  }, [])

  const handleFabClick = () => {
    if (!armyId) {
      setNoXpMessage(false)
      setNoArmyMessage(true)
      if (noArmyTimeoutRef.current) clearTimeout(noArmyTimeoutRef.current)
      noArmyTimeoutRef.current = setTimeout(() => setNoArmyMessage(false), 3000)
      return
    }
    if (!initialXpCompleted) {
      setNoArmyMessage(false)
      setNoXpMessage(true)
      if (noXpTimeoutRef.current) clearTimeout(noXpTimeoutRef.current)
      noXpTimeoutRef.current = setTimeout(() => setNoXpMessage(false), 3000)
      return
    }
    setOpen(true)
  }

  const handleRetry = () => {
    retryOpponents()
  }

  const selectedOpponentName = opponents.find((o) => o.playerId === selectedOpponent)?.playerUsername ?? 'cet adversaire'

  const doCreateMatch = async () => {
    const opponent = invariant(selectedOpponent, 'doCreateMatch requires a selected opponent')
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await createMatchFn({ data: { opponentPlayerId: opponent, date, time } })
      setOpen(false)
      setSelectedOpponent(null)
      setIsSubmitting(false)
      queryClient.invalidateQueries({ queryKey: ['opponents'] })
      queryClient.invalidateQueries({ queryKey: ['session'] })
      await invalidateArmyState(queryClient, router)
      await router.navigate({ to: '/' })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur lors de la création de la partie.')
    } finally {
      // H1 — ensure isSubmitting is always reset (covers both success and error paths)
      setIsSubmitting(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedOpponent || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const { isDuplicate } = await checkDuplicateMatchFn({ data: { opponentPlayerId: selectedOpponent, date } })
      if (isDuplicate) {
        setIsSubmitting(false)
        setDuplicateConfirmOpen(true)
        return
      }
      await doCreateMatch()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur lors de la vérification.')
      setIsSubmitting(false)
    }
  }

  const handleDuplicateConfirm = async () => {
    setDuplicateConfirmOpen(false)
    try {
      await doCreateMatch()
    } catch {
      // doCreateMatch handles its own errors via setSubmitError
    }
  }

  return (
    <>
      {/* Blocker messages */}
      <FabBlockerMessage visible={noArmyMessage} message="Vous devez avoir une armée pour créer une partie" />
      <FabBlockerMessage visible={noXpMessage} message="Complétez d'abord l'XP initiale de votre armée" />

      {/* FAB button */}
      <button
        data-testid="create-match-fab"
        aria-label="Créer une partie"
        onClick={handleFabClick}
        className="absolute right-4 z-2 size-14 rounded-full bg-cw-brand text-white text-2xl border-none cursor-pointer shadow-[0_6px_16px_rgba(0,0,0,0.18)] flex items-center justify-center font-bold"
        style={{ bottom: FAB_BOTTOM }}
      >
        +
      </button>

      {/* Match creation dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cw-display font-semibold">
              Nouvelle partie
            </DialogTitle>
            <DialogDescription className="sr-only">
              Choisir un adversaire et une date pour créer une nouvelle partie
            </DialogDescription>
          </DialogHeader>

          {/* Opponent list */}
          <div>
            {isLoading ? (
              <p className="text-cw-text-secondary text-sm">
                Chargement des adversaires…
              </p>
            ) : loadError ? (
              <div>
                <p className="text-cw-malus text-sm mb-2">
                  Impossible de charger la liste des adversaires.
                </p>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  Réessayer
                </Button>
              </div>
            ) : opponents.length === 0 ? (
              <p className="text-cw-text-secondary text-sm italic">
                Aucun adversaire disponible
              </p>
            ) : (
              <>
                <Input
                  placeholder="Rechercher un joueur…"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="mb-2"
                />
                {filteredOpponents.length === 0 ? (
                  <p className="text-cw-text-secondary text-sm italic">
                    Aucun résultat
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto">
                    {filteredOpponents.map((opponent) => (
                      <button
                        key={opponent.playerId}
                        onClick={() => setSelectedOpponent(opponent.playerId)}
                        className={cn(
                          'text-left rounded-lg px-3 py-2.5 cursor-pointer',
                          selectedOpponent === opponent.playerId
                            ? 'bg-cw-tab-active-bg border-2 border-cw-info'
                            : 'bg-cw-surface border border-cw-border'
                        )}
                      >
                        {/* playerUsername displayed with Cinzel (font-display) */}
                        <div className="font-cw-display font-semibold text-[15px] text-cw-text-primary">
                          {opponent.playerUsername}
                        </div>
                        <div className="text-xs text-cw-text-secondary">
                          {opponent.hasArmy
                            ? `${opponent.armyName} — ${opponent.faction}`
                            : 'Armée non attribuée'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Date + time inputs */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="match-date" className="text-[13px] font-semibold text-cw-text-primary block mb-1">
                Date
              </label>
              <Input
                id="match-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="match-time" className="text-[13px] font-semibold text-cw-text-primary block mb-1">
                Heure
              </label>
              <Input
                id="match-time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Submit error */}
          {submitError && (
            <p className="text-cw-malus text-[13px] m-0">
              {submitError}
            </p>
          )}

          {/* Confirm button — disabled until opponent is selected */}
          <Button
            variant="brand"
            onClick={handleConfirm}
            disabled={!selectedOpponent || isSubmitting || isLoading}
            className="w-full min-h-[44px] text-[15px] font-bold rounded-xl"
          >
            {isSubmitting ? 'Création en cours...' : 'Créer la partie'}
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={duplicateConfirmOpen} onOpenChange={setDuplicateConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Match en doublon</AlertDialogTitle>
            <AlertDialogDescription>
              Un match contre {selectedOpponentName} existe déjà à cette date. Souhaitez-vous créer un match supplémentaire contre {selectedOpponentName} ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicateConfirm} disabled={isSubmitting}>
              {isSubmitting ? 'Création en cours...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
