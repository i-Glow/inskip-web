import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from '../../src/hooks/useAuth'
import { ToastProvider } from '../../src/components/ui/Toast'

export function makeSession(email = 'jo@example.com'): Session {
  return {
    access_token: 't',
    refresh_token: 'r',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: 'u1', email },
  } as Session
}

export function makeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    session: null,
    user: null,
    loading: false,
    signInWithEmail: async () => {},
    signOut: async () => {},
    ...overrides,
  }
}

export function authFor(email = 'jo@example.com', overrides: Partial<AuthContextValue> = {}) {
  const session = makeSession(email)
  return makeAuth({ session, user: session.user, ...overrides })
}

export function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="location">{loc.pathname}</div>
}

export function newQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

interface Options {
  route?: string
  auth?: AuthContextValue
  queryClient?: QueryClient
}

export function Providers({
  children,
  route = '/',
  auth = makeAuth(),
  queryClient,
}: Options & { children: React.ReactNode }) {
  const qc = queryClient ?? newQueryClient()
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <AuthContext.Provider value={auth}>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const queryClient = options.queryClient ?? newQueryClient()
  return {
    queryClient,
    ...render(ui, {
      wrapper: ({ children }) => (
        <Providers {...options} queryClient={queryClient}>
          {children}
        </Providers>
      ),
    }),
  }
}
