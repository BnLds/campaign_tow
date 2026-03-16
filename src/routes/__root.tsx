import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  redirect,
  useLocation,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { z } from 'zod'
import TanStackQueryProvider from '../integrations/tanstack-query/root-provider'
import { TabBar } from '../components/tab-bar'
import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'
import type { SessionData } from '../lib/auth'

// Server function: reads session server-side.
// Dynamic import keeps auth.ts (server-only) out of the client bundle.
const getSessionFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { getSession } = await import('../lib/auth')
  return getSession()
})

// Server function: clears session server-side (cookie + DB row).
// Dynamic import pattern (import-protection) — do NOT throw redirect here;
// let the client navigate after the call returns.
const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { deleteSession } = await import('../lib/auth')
  await deleteSession()
})

// Server function: loads a player's army info + win/draw/loss record.
// Accepts playerId as input to avoid a redundant session read (beforeLoad already has it).
const getPlayerArmyInfoFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ playerId: z.string() }))
  .handler(async ({ data: { playerId } }) => {
    const { getPlayerArmy, getArmyRecord } = await import('../db/queries')
    const army = await getPlayerArmy(playerId)
    if (!army) return { army: null, record: null }
    const record = await getArmyRecord(army.id)
    return {
      army: { id: army.id, name: army.name, faction: army.faction },
      record,
    }
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
  beforeLoad: async ({ location }) => {
    // Always return { session } so TanStack Router updates context on every navigation.
    // Returning undefined for /login would leave stale session in context → AppHeader
    // would persist across login/logout transitions (bug: header visible on /login page).
    if (location.pathname === '/login') return { session: null as SessionData | null, army: null, record: null }

    const session = await getSessionFn()
    if (!session) {
      throw redirect({ to: '/login' })
    }

    // Guests have no army — skip the server call entirely
    if (session.isGuest) {
      return { session: session as SessionData | null, army: null, record: null }
    }

    // Load army info for the header — degrade gracefully on failure
    let army: { id: string; name: string; faction: string } | null = null
    let record: { wins: number; draws: number; losses: number } | null = null
    try {
      const info = await getPlayerArmyInfoFn({ data: { playerId: session.playerId } })
      army = info.army
      record = info.record
    } catch (err) {
      console.error('[root beforeLoad] Failed to load army info:', err)
    }

    return { session: session as SessionData | null, army, record }
  },
  component: RootLayout,
  shellComponent: RootDocument,
})

function RootLayout() {
  const { session, army, record } = useRouteContext({ from: '__root__' })
  const location = useLocation()
  const currentPath = location.pathname

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        minHeight: '100vh',
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
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logoutFn()
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
            <Link
              to="/armies/$armyId"
              params={{ armyId: army.id }}
              style={{ color: 'var(--color-brand)', fontSize: 11 }}
            >
              Voir l'armée
            </Link>
          </>
        ) : (
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            {session.isGuest ? 'Invité' : session.displayName}
          </span>
        )}
      </div>

      {/* Right block: account + actions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0, marginLeft: 12 }}>
        {army && (
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            {session.displayName}
          </span>
        )}
        {session.isGuest ? (
          <button data-testid="login-button" onClick={handleLogout} disabled={loggingOut} style={btnStyle}>
            {loggingOut ? 'Connexion…' : 'Se connecter'}
          </button>
        ) : (
          <button data-testid="logout-button" onClick={handleLogout} disabled={loggingOut} style={btnStyle}>
            {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
        )}
        {session.isAdmin && (
          <a href="/admin" data-testid="admin-link"
            onClick={(e) => { e.preventDefault(); router.navigate({ to: '/admin' }) }}
            style={{ color: 'var(--color-brand)', fontSize: '0.875rem', textDecoration: 'none' }}
          >Administration</a>
        )}
      </div>
    </header>
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
