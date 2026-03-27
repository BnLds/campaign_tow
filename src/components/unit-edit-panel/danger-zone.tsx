// Campaign TOW — DangerZone: graveyard + permanent deletion for UnitEditPanel

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
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
} from '../ui/alert-dialog'
import { sendToGraveyardFn, deleteUnitFn } from '../../server-fns/unit-mutations'
import { useFeedback, FeedbackMsg } from './use-feedback'

interface DangerZoneProps {
  armyId: string
  unitId: string
}

export function DangerZone({ armyId, unitId }: DangerZoneProps) {
  const [showGraveyardInput, setShowGraveyardInput] = useState(false)
  const [graveyardReason, setGraveyardReason] = useState('')
  const dangerFeedback = useFeedback()
  const router = useRouter()

  const { mutate: sendToGraveyard, isPending: sendingToGraveyard } = useMutation({
    mutationFn: (reason: string) => sendToGraveyardFn({ data: { armyId, unitId, reason } }),
    onSuccess: (result) => {
      if (result.success) {
        void router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
      } else {
        dangerFeedback.show(result.error.message, true)
      }
    },
    onError: () => {
      dangerFeedback.show('Erreur réseau', true)
    },
  })

  const { mutate: deleteUnit, isPending: deletingUnit } = useMutation({
    mutationFn: () => deleteUnitFn({ data: { armyId, unitId } }),
    onSuccess: (result) => {
      if (result.success) {
        void router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
      } else {
        dangerFeedback.show(result.error.message, true)
      }
    },
    onError: () => {
      dangerFeedback.show('Erreur réseau', true)
    },
  })

  return (
    <div className="border-t border-[var(--color-border)] mt-6 pt-4">
      <h4 className="font-[family-name:var(--font-body)] font-bold text-xs uppercase tracking-wider text-[var(--color-malus)] mb-3">
        Zone de danger
      </h4>

      {!showGraveyardInput ? (
        <button
          data-testid="graveyard-button"
          onClick={() => setShowGraveyardInput(true)}
          className="block w-full py-2 px-4 border border-[#b45309] rounded-md bg-transparent text-[#b45309] font-[family-name:var(--font-body)] font-semibold text-[0.8125rem] cursor-pointer mb-3"
        >
          Envoyer au cimetière
        </button>
      ) : (
        <div data-testid="graveyard-form" className="mb-3 flex flex-col gap-2">
          <Input
            data-testid="graveyard-reason-input"
            type="text"
            placeholder="Raison (ex: tué par un dragon)"
            value={graveyardReason}
            onChange={(e) => setGraveyardReason(e.target.value)}
            maxLength={200}
          />
          <div className="flex gap-2">
            <Button
              data-testid="graveyard-confirm"
              size="sm"
              disabled={sendingToGraveyard || !graveyardReason.trim()}
              onClick={() => {
                if (!graveyardReason.trim()) {
                  dangerFeedback.show('La raison ne peut pas être vide', true)
                  return
                }
                sendToGraveyard(graveyardReason.trim())
              }}
              className="bg-[#334155] text-white"
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

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            data-testid="delete-unit-button"
            className="block w-full py-2 px-4 border-none rounded-md bg-[var(--color-malus)] text-white font-[family-name:var(--font-body)] font-semibold text-[0.8125rem] cursor-pointer"
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
            <AlertDialogCancel className="border border-[#334155] text-[#334155]">Annuler</AlertDialogCancel>
            <AlertDialogAction
              data-testid="delete-unit-confirm"
              disabled={deletingUnit}
              onClick={(e) => {
                e.preventDefault()
                deleteUnit()
              }}
              className="bg-[var(--color-malus)] text-white"
            >
              {deletingUnit ? 'Suppression...' : 'Détruire'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackMsg message={dangerFeedback.message} />
    </div>
  )
}
