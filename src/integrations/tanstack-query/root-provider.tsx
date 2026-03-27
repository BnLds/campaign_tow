import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getContext() {
  // Server: always create a fresh client so requests never share cached data
  if (typeof window === 'undefined') {
    return { queryClient: makeQueryClient() }
  }
  // Browser: reuse a singleton so client-side navigations keep their cache
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return { queryClient: browserQueryClient }
}

export default function TanStackQueryProvider({
  children,
}: {
  children: ReactNode
}) {
  const { queryClient } = getContext()

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
