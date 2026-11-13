import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../../src/hooks/AuthProvider'
import { useAuth } from '../../src/hooks/useAuth'
import { makeSession } from '../helpers/render'
import { resetSupabaseMock, supabaseMock } from '../helpers/supabase'

vi.mock('../../src/lib/supabase', async () => (await import('../helpers/supabase')).supabaseModuleMock())

function Probe() {
  const { loading, user, signInWithEmail, signOut } = useAuth()
  return (
    <div>
      <span data-testid="state">{loading ? 'loading' : (user?.email ?? 'anonymous')}</span>
      <button onClick={() => void signInWithEmail('a@b.fr')}>in</button>
      <button onClick={() => void signOut()}>out</button>
    </div>
  )
}

let unsubscribe: ReturnType<typeof vi.fn>
beforeEach(() => {
  ;({ unsubscribe } = resetSupabaseMock())
})

describe('AuthProvider', () => {
  it('loads the initial session via getSession', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: makeSession('x@y.fr') } })
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByTestId('state')).toHaveTextContent('loading')
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('x@y.fr'))
  })

  it('becomes anonymous when there is no session', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anonymous'))
  })

  it('reacts to onAuthStateChange', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anonymous'))
    const cb = supabaseMock.auth.onAuthStateChange.mock.calls[0][0]
    act(() => cb('SIGNED_IN', makeSession('new@y.fr')))
    expect(screen.getByTestId('state')).toHaveTextContent('new@y.fr')
    act(() => cb('SIGNED_OUT', null))
    expect(screen.getByTestId('state')).toHaveTextContent('anonymous')
  })

  it('unsubscribes on unmount', () => {
    const { unmount } = render(<AuthProvider><Probe /></AuthProvider>)
    expect(unsubscribe).not.toHaveBeenCalled()
    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('signInWithEmail calls signInWithOtp with the callback redirect', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await userEvent.click(screen.getByText('in'))
    expect(supabaseMock.auth.signInWithOtp).toHaveBeenCalledOnce()
    const arg = supabaseMock.auth.signInWithOtp.mock.calls[0][0]
    expect(arg.email).toBe('a@b.fr')
    expect(arg.options.emailRedirectTo.endsWith('/auth/callback')).toBe(true)
  })

  it('signOut calls supabase.auth.signOut', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await userEvent.click(screen.getByText('out'))
    expect(supabaseMock.auth.signOut).toHaveBeenCalledOnce()
  })
})
