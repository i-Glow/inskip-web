import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import AuthCallbackPage from '../../src/pages/AuthCallbackPage'
import { authFor, LocationProbe, makeAuth, renderWithProviders } from '../helpers/render'
import { Route, Routes } from 'react-router-dom'

function ui() {
  return (
    <>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/challenges" element={<p>challenges</p>} />
      </Routes>
      <LocationProbe />
    </>
  )
}

afterEach(() => {
  vi.useRealTimers()
  window.location.hash = ''
})

describe('AuthCallbackPage', () => {
  it('navigates to /challenges once a session exists', () => {
    renderWithProviders(ui(), { route: '/auth/callback', auth: authFor() })
    expect(screen.getByTestId('location')).toHaveTextContent('/challenges')
  })

  it('shows a waiting message without session', () => {
    renderWithProviders(ui(), { route: '/auth/callback', auth: makeAuth() })
    expect(screen.getByText('Connexion en cours…')).toBeInTheDocument()
  })

  it('shows a French error when the URL carries error_description', () => {
    window.location.hash = '#error_description=Email+link+is+invalid'
    renderWithProviders(ui(), { route: '/auth/callback', auth: makeAuth() })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Le lien de connexion est invalide ou a expiré.',
    )
    expect(screen.getByRole('link', { name: 'Retour à la connexion' })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('shows an error after the timeout when no session arrives', () => {
    vi.useFakeTimers()
    renderWithProviders(ui(), { route: '/auth/callback', auth: makeAuth() })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByRole('alert')).toHaveTextContent('invalide ou a expiré')
  })
})
