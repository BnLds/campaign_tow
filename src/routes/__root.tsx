import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  redirect,
  useLocation,
  useRouteContext,
} from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import TanStackQueryProvider from '../integrations/tanstack-query/root-provider'
import { TabBar } from '../components/tab-bar'
import { CreateMatchFab } from '../components/create-match-fab'
import { AppHeader } from '../components/app-header'
import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'
import type { SessionData } from '../lib/auth'
import { sessionQueryOptions, armyInfoQueryOptions } from '../lib/session-queries'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: "Campagne TOW 2026 - Launa'Gamers" },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  beforeLoad: async ({ location, context: { queryClient } }) => {
    // Always return { session } so TanStack Router updates context on every navigation.
    // Returning undefined for /login would leave stale session in context → AppHeader
    // would persist across login/logout transitions (bug: header visible on /login page).
    if (location.pathname === '/login' || location.pathname.startsWith('/invite')) {
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
          initialXpCompleted={army?.initialXpCompleted ?? false}
        />
      )}
      {session && <TabBar currentPath={currentPath} />}
    </div>
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
