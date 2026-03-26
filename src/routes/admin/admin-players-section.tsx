import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import type { AdminQueries } from './use-admin-queries'
import { usePlayerSection } from './use-player-section'

interface AdminPlayersSectionProps {
  queries: AdminQueries
  session: { playerId: string; isAdmin: boolean } | null
}

export function AdminPlayersSection({ queries, session }: AdminPlayersSectionProps) {
  const { state, actions } = usePlayerSection(queries)

  return (
    <>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        Créer un compte joueur
      </h2>

      {state.createdPlayer && (
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
          Compte créé pour <strong>{state.createdPlayer.username}</strong>. Utilisez le bouton "Copier le lien" dans la liste pour envoyer le lien d'invitation.
        </div>
      )}

      {state.serverError && (
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
          {state.serverError}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); actions.form.handleSubmit() }}>
        <actions.form.Field name="username">
          {(field: any) => (
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
        </actions.form.Field>

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

        {(state.deleteError || queries.playersQuery.error) && (
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
            {[queries.playersQuery.error ? 'Impossible de charger la liste des joueurs' : null, state.deleteError].filter(Boolean).join(' — ')}
          </div>
        )}

        {queries.playersQuery.isPending ? (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Chargement…</p>
        ) : <div>
          {(queries.playersQuery.data ?? []).map((player) => (
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
                {player.username}
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
                <>
                  <button
                    data-testid={`copy-invite-${player.id}`}
                    onClick={() => actions.handleCopyInviteLink(player.id)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--color-brand)',
                      color: 'var(--color-brand)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {state.copyFeedback[player.id] ? 'Copié !' : 'Copier le lien'}
                  </button>
                  <button
                    data-testid={`regen-invite-${player.id}`}
                    onClick={() => actions.setRegenDialogPlayerId(player.id)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--color-text-secondary)',
                      color: 'var(--color-text-secondary)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    Regénérer
                  </button>
                  <button
                    data-testid={`delete-player-${player.id}`}
                    onClick={() => actions.handleDelete(player.id, player.username)}
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
                </>
              )}
            </div>
          ))}
        </div>}

        {state.bulkGenerateResult && (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-bonus)', marginTop: '0.5rem' }}>
            {state.bulkGenerateResult}
          </p>
        )}
        <button
          data-testid="bulk-generate-tokens"
          onClick={actions.handleBulkGenerate}
          style={{
            marginTop: '0.75rem',
            background: 'none',
            border: '1px solid var(--color-brand)',
            color: 'var(--color-brand)',
            padding: '0.375rem 0.75rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Générer tous les liens manquants
        </button>
      </section>

      <AlertDialog open={!!state.regenDialogPlayerId} onOpenChange={(open) => { if (!open) actions.setRegenDialogPlayerId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regénérer le lien d'invitation ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'ancien lien sera définitivement invalidé. Le joueur devra utiliser le nouveau lien pour se connecter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={actions.handleRegenConfirm}>Regénérer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
