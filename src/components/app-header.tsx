import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { logoutFn } from '../server-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu'
import { Menu } from 'lucide-react'
import type { SessionData } from '../lib/auth'

function RecordBadge({ record }: { record: { wins: number; draws: number; losses: number } }) {
  const total = record.wins + record.draws + record.losses
  if (total === 0) {
    return <span className="text-[var(--color-text-muted)] italic">Aucune partie</span>
  }
  const parts: React.ReactNode[] = []
  if (record.wins > 0) parts.push(<span key="wins" className="text-[var(--color-bonus)] font-bold">{record.wins}V</span>)
  if (record.draws > 0) parts.push(<span key="draws" className="text-[var(--color-text-secondary)] font-bold">{record.draws}N</span>)
  if (record.losses > 0) parts.push(<span key="losses" className="text-[var(--color-malus)] font-bold">{record.losses}D</span>)
  parts.push(<span key="total" className="text-[var(--color-text-muted)]">{total} parties</span>)
  const separated = parts.reduce<React.ReactNode[]>((acc, part, i) => {
    if (i > 0) acc.push(<span key={`sep-${i}`} className="text-[var(--color-text-muted)]"> &middot; </span>)
    acc.push(part)
    return acc
  }, [])
  return <><span className="text-[var(--color-text-muted)]"> &middot; </span>{separated}</>
}

export function AppHeader({
  session,
  army,
  record,
}: {
  session: SessionData
  army: { id: string; name: string; faction: string } | null
  record: { wins: number; draws: number; losses: number } | null
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loggingOut, setLoggingOut] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logoutFn()
      queryClient.clear()
      await router.invalidate()
      await router.navigate({ to: '/login' })
    } catch {
      setLoggingOut(false)
      alert('La déconnexion a échoué. Veuillez réessayer.')
    }
  }

  return (
    <>
      <header className="flex justify-between items-start p-[8px_12px] border-b border-[var(--color-border)] bg-[var(--color-header-bg)]">
        {/* Left block: army info or display name */}
        <div className="min-w-0 flex-1">
          {army ? (
            <>
              <div className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)] overflow-hidden text-ellipsis whitespace-nowrap">
                {army.name}
              </div>
              <div className="font-[family-name:var(--font-body)] text-[11px] text-[var(--color-text-secondary)] flex flex-wrap gap-[4px] items-center">
                <span>{army.faction}</span>
                {record && <RecordBadge record={record} />}
              </div>
            </>
          ) : (
            <span
              className={
                session.isGuest
                  ? 'font-[family-name:var(--font-body)] text-[0.875rem] font-normal text-[var(--color-text-secondary)]'
                  : 'font-[family-name:var(--font-display)] text-[16px] font-bold text-[var(--color-text-primary)]'
              }
            >
              {session.isGuest ? 'Invité' : 'Campaign TOW'}
            </span>
          )}
        </div>

        {/* Right block: account + actions */}
        {session.isGuest ? (
          <div className="shrink-0 ml-[12px]">
            <button
              data-testid="login-button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={`bg-transparent border-none text-[var(--color-brand)] text-[0.875rem] p-[0.5rem] ${loggingOut ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
            >
              {loggingOut ? 'Connexion…' : 'Se connecter'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-[8px] shrink-0 ml-[12px]">
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              {session.username}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="hamburger-button"
                  aria-label="Menu"
                  className="bg-transparent border-none cursor-pointer p-[4px]"
                >
                  <Menu size={20} color="var(--color-brand)" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  data-testid="my-army-link"
                  disabled={!army}
                  onSelect={() => {
                    if (army) {
                      router.navigate({ to: '/armies/$armyId', params: { armyId: army.id } })
                    }
                  }}
                >
                  Voir mon armée
                </DropdownMenuItem>
                {session.isAdmin && (
                  <DropdownMenuItem
                    data-testid="admin-link"
                    onSelect={() => router.navigate({ to: '/admin' })}
                  >
                    Administration
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  data-testid="settings-link"
                  onSelect={() => router.navigate({ to: '/settings' })}
                >
                  Paramètres
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    setOptionsOpen(true)
                  }}
                >
                  Options
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </header>

      <Dialog open={optionsOpen} onOpenChange={(isOpen) => { if (!isOpen) setOptionsOpen(false) }}>
        <DialogContent className="bg-[var(--color-surface)] border border-[var(--color-border)] max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-display)] text-[var(--color-text-primary)]">
              Options
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <button
              data-testid="logout-button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={`bg-[var(--color-malus)] text-white border-none rounded-md py-[0.625rem] px-4 text-sm font-[family-name:var(--font-body)] font-semibold w-full ${loggingOut ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
            >
              {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
