import { vi } from 'vitest'

export interface QueryResult {
  data?: unknown
  error?: unknown
}

/** Chainable, awaitable stand-in for a PostgREST query builder. */
export function queryBuilder(result: QueryResult = {}) {
  const res = { data: null, error: null, ...result }
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single']) {
    b[m] = vi.fn(() => b)
  }
  b.then = (resolve: (v: typeof res) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(res).then(resolve, reject)
  return b as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<typeof res>
}

export const supabaseMock = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithOtp: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
}

/** Module factory for vi.mock('.../src/lib/supabase'). */
export function supabaseModuleMock() {
  return { supabase: supabaseMock }
}

/** Reset every mock to a harmless default. Call in beforeEach. */
export function resetSupabaseMock() {
  const unsubscribe = vi.fn()
  supabaseMock.auth.getSession.mockReset().mockResolvedValue({ data: { session: null } })
  supabaseMock.auth.onAuthStateChange
    .mockReset()
    .mockReturnValue({ data: { subscription: { unsubscribe } } })
  supabaseMock.auth.signInWithOtp.mockReset().mockResolvedValue({ error: null })
  supabaseMock.auth.signOut.mockReset().mockResolvedValue({ error: null })
  supabaseMock.from.mockReset().mockImplementation(() => queryBuilder())
  supabaseMock.rpc.mockReset().mockResolvedValue({ data: 0, error: null })
  return { unsubscribe }
}
