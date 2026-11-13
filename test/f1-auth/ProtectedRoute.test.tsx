import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen } from '@testing-library/react'
import ProtectedRoute from '../../src/components/layout/ProtectedRoute'
import { authFor, LocationProbe, makeAuth, renderWithProviders } from '../helpers/render'

function ui() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/challenges" element={<p>secret</p>} />
        </Route>
      </Routes>
      <LocationProbe />
    </>
  )
}

describe('ProtectedRoute', () => {
  it('shows a loader while auth is loading', () => {
    renderWithProviders(ui(), { route: '/challenges', auth: makeAuth({ loading: true }) })
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })

  it('redirects to /login without a session', () => {
    renderWithProviders(ui(), { route: '/challenges', auth: makeAuth() })
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })

  it('renders the outlet with a session', () => {
    renderWithProviders(ui(), { route: '/challenges', auth: authFor() })
    expect(screen.getByText('secret')).toBeInTheDocument()
  })
})
