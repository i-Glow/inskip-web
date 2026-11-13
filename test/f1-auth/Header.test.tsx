import { describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from '../../src/components/layout/Header'
import { authFor, LocationProbe, renderWithProviders } from '../helpers/render'

function ui() {
  return (
    <>
      <Routes>
        <Route path="/challenges" element={<Header />} />
        <Route path="/login" element={<p>login page</p>} />
      </Routes>
      <LocationProbe />
    </>
  )
}

describe('Header', () => {
  it('shows the user email', () => {
    renderWithProviders(ui(), { route: '/challenges', auth: authFor('ana@example.com') })
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
  })

  it('signs out then goes to /login', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(ui(), { route: '/challenges', auth: authFor('ana@example.com', { signOut }) })
    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))
    expect(signOut).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'))
  })
})
