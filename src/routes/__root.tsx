import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  redirect,
  useLocation,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import TanStackQueryProvider from '../integrations/tanstack-query/root-provider'
import { TabBar } from '../components/tab-bar'
import { CreateMatchFab } from '../components/create-match-fab'
import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'
import type { SessionData } from '../lib/auth'
import { sessionQueryOptions, armyInfoQueryOptions } from '../lib/session-queries'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Menu } from 'lucide-react'

// Server function: clears session server-side (cookie + DB row).
// Dynamic import pattern (import-protection) — do NOT throw redirect here;
// let the client navigate after the call returns.
const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { deleteSession } = await import('../lib/auth')
  await deleteSession()
})

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Campaign TOW' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  beforeLoad: async ({ location, context: { queryClient } }) => {
    // Always return { session } so TanStack Router updates context on every navigation.
    // Returning undefined for /login would leave stale session in context → AppHeader
    // would persist across login/logout transitions (bug: header visible on /login page).
    if (location.pathname === '/login') {
      return { session: null as SessionData | null, army: null, record: null }
    }

    const session = await queryClient.ensureQueryData(sessionQueryOptions())
    if (!session) {
      throw redirect({ to: '/login' })
    }

    // Guests have no army — skip the server call entirely
    if (session.isGuest) {
      return { session, army: null, record: null }
    }

    const info = await queryClient.ensureQueryData(armyInfoQueryOptions(session.playerId))
    return {
      session,
      army: info.army,
      record: info.record,
    }
  },
  component: RootLayout,
  shellComponent: RootDocument,
})

function RootLayout() {
  const { session } = useRouteContext({ from: '__root__' })
  const location = useLocation()
  const currentPath = location.pathname

  // Reactive queries: subscribe to cache so header updates on invalidation
  // (beforeLoad only runs on navigation, not on router.invalidate)
  const playerId = session && !session.isGuest ? session.playerId : undefined
  const { data: armyInfo } = useQuery({
    ...armyInfoQueryOptions(playerId ?? ''),
    enabled: !!playerId,
  })
  const army = armyInfo?.army ?? null
  const record = armyInfo?.record ?? null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        minHeight: '100%',
        position: 'relative',
      }}
    >
      {session && <AppHeader key={session.playerId} session={session} army={army} record={record} />}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: 68,
          minHeight: 0,
        }}
      >
        <Outlet />
      </div>
      {session && !session.isGuest && (
        <CreateMatchFab
          session={{ playerId: session.playerId, isGuest: session.isGuest }}
          armyId={army?.id ?? null}
        />
      )}
      {session && <TabBar currentPath={currentPath} />}
    </div>
  )
}

function AppHeader({
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const prevMenuOpen = useRef(false)
  useEffect(() => {
    if (menuOpen) {
      const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')
      firstItem?.focus()
    } else if (prevMenuOpen.current) {
      hamburgerRef.current?.focus()
    }
    prevMenuOpen.current = menuOpen
  }, [menuOpen])

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
    }
  }

  const btnStyle = { background: 'none', border: 'none', color: 'var(--color-brand)', cursor: loggingOut ? 'not-allowed' : 'pointer', fontSize: '0.875rem', padding: '0.5rem', opacity: loggingOut ? 0.7 : 1 }

  const formatRecord = () => {
    if (!record) return null
    const total = record.wins + record.draws + record.losses
    if (total === 0) {
      return <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Aucune partie</span>
    }
    const parts: React.ReactNode[] = []
    parts.push(<span key="sep-start" style={{ color: 'var(--color-text-muted)' }}> · </span>)
    if (record.wins > 0) parts.push(<span key="wins" style={{ color: 'var(--color-bonus)', fontWeight: 700 }}>{record.wins}V</span>)
    if (record.draws > 0) parts.push(<span key="draws" style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>{record.draws}N</span>)
    if (record.losses > 0) parts.push(<span key="losses" style={{ color: 'var(--color-malus)', fontWeight: 700 }}>{record.losses}D</span>)
    parts.push(<span key="total" style={{ color: 'var(--color-text-muted)' }}>{total} parties</span>)
    return parts.reduce<React.ReactNode[]>((acc, part, i) => {
      if (i > 1) acc.push(<span key={`sep-${i}`} style={{ color: 'var(--color-text-muted)' }}> · </span>)
      acc.push(part)
      return acc
    }, [])
  }

  return (
    <>
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '8px 12px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-header-bg)',
      }}
    >
      {/* Left block: army info or display name */}
      <div style={{ minWidth: 0, flex: 1 }}>
        {army ? (
          <>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 16,
                color: 'var(--color-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {army.name}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                color: 'var(--color-text-secondary)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
                alignItems: 'center',
              }}
            >
              <span>{army.faction}</span>
              {record && formatRecord()}
            </div>
          </>
        ) : (
          <span style={{
            fontFamily: session.isGuest ? 'var(--font-body)' : 'var(--font-display)',
            fontSize: session.isGuest ? '0.875rem' : 16,
            fontWeight: session.isGuest ? 400 : 700,
            color: session.isGuest ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
          }}>
            {session.isGuest ? 'Invité' : 'Campaign TOW'}
          </span>
        )}
      </div>

      {/* Right block: account + actions */}
      {session.isGuest ? (
        <div style={{ flexShrink: 0, marginLeft: 12 }}>
          <button data-testid="login-button" onClick={handleLogout} disabled={loggingOut} style={btnStyle}>
            {loggingOut ? 'Connexion…' : 'Se connecter'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12, position: 'relative' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            {session.displayName}
          </span>
          <button
            ref={hamburgerRef}
            data-testid="hamburger-button"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="Menu"
            onClick={() => setMenuOpen((prev) => !prev)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <Menu size={20} color="var(--color-brand)" />
          </button>
          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setMenuOpen(false)} />
              <div
                ref={menuRef}
                role="menu"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  zIndex: 10,
                  marginTop: 4,
                  minWidth: 180,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  overflow: 'hidden',
                }}
              >
                <button
                  role="menuitem"
                  data-testid="my-army-link"
                  disabled={!army}
                  aria-disabled={!army}
                  onClick={() => {
                    if (!army) return
                    setMenuOpen(false)
                    router.navigate({ to: '/armies/$armyId', params: { armyId: army.id } })
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: army ? 'pointer' : 'default',
                    fontSize: '0.875rem',
                    color: army ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    fontFamily: 'var(--font-body)',
                    opacity: army ? 1 : 0.5,
                  }}
                >
                  Voir mon armee
                </button>
                {session.isAdmin && (
                  <button
                    role="menuitem"
                    data-testid="admin-link"
                    onClick={() => {
                      setMenuOpen(false)
                      router.navigate({ to: '/admin' })
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 14px',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: 'var(--color-text-primary)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Administration
                  </button>
                )}
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setOptionsOpen(true)
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Options
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
    <Dialog open={optionsOpen} onOpenChange={(isOpen) => { if (!isOpen) setOptionsOpen(false) }}>
      <DialogContent style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', maxWidth: 340 }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            Options
          </DialogTitle>
        </DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <button
            data-testid="logout-button"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              background: 'var(--color-malus)',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              padding: '0.625rem 1rem',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              cursor: loggingOut ? 'not-allowed' : 'pointer',
              opacity: loggingOut ? 0.7 : 1,
              width: '100%',
            }}
          >
            {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        <TanStackQueryProvider>{children}</TanStackQueryProvider>
        <Scripts />
      </body>
    </html>
  )
}
