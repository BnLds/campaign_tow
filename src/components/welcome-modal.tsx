import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { updateDisplayNameSchema } from '../lib/validators'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

interface WelcomeModalProps {
  open: boolean
  displayName: string
  onDismiss: () => void
  onUpdateDisplayName: (name: string) => Promise<void>
}

export function WelcomeModal({ open, displayName, onDismiss, onUpdateDisplayName }: WelcomeModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm({
    defaultValues: { displayName },
    validators: { onSubmit: updateDisplayNameSchema },
    onSubmit: async ({ value }) => {
      try {
        setSubmitError(null)
        await onUpdateDisplayName(value.displayName)
        onDismiss()
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Une erreur est survenue')
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onDismiss() }}>
      <DialogContent style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand)' }}>
            Bienvenue dans Campaign TOW
          </DialogTitle>
          <DialogDescription>
            Cette application vous permet de suivre l'évolution de votre armée au fil de la campagne :
            XP gagné, améliorations débloquées, blessures permanentes, et historique de vos parties.
            Pour toute question ou problème de compte, contactez Ben (admin).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
          <form.Field name="displayName">
            {(field) => (
              <div style={{ marginBottom: '1rem' }}>
                <Label htmlFor="displayName">Nom d'affichage</Label>
                <Input
                  id="displayName"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Votre nom dans la campagne"
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
          {submitError && (
            <p style={{ color: 'var(--color-malus)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              {submitError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onDismiss}>
              Continuer sans modifier
            </Button>
            <Button type="submit" style={{ background: 'var(--color-brand)', color: 'white' }}>
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
