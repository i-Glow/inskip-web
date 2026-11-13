import { describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '../../src/pages/LoginPage'
import { authFor, LocationProbe, makeAuth, renderWithProviders } from '../helpers/render'

function ui() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/challenges" element={<p>challenges</p>} />
      </Routes>
      <LocationProbe />
    </>
  )
}

describe('LoginPage', () => {
  it('submits the email and shows the sent message', async () => {
    const signInWithEmail = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(ui(), { route: '/login', auth: makeAuth({ signInWithEmail }) })
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), '  jo@example.com ')
    await userEvent.click(screen.getByRole('button', { name: /Recevoir un lien/ }))
    expect(signInWithEmail).toHaveBeenCalledWith('jo@example.com')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Un lien de connexion a été envoyé à jo@example.com.',
    )
  })

  it('shows a French error when sending fails', async () => {
    const signInWithEmail = vi.fn().mockRejectedValue(new Error('boom'))
    renderWithProviders(ui(), { route: '/login', auth: makeAuth({ signInWithEmail }) })
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'jo@example.com')
    await userEvent.click(screen.getByRole('button', { name: /Recevoir un lien/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible d’envoyer le lien de connexion. Veuillez réessayer.',
    )
  })

  it('disables the submit button while the email is empty', () => {
    renderWithProviders(ui(), { route: '/login' })
    expect(screen.getByRole('button', { name: /Recevoir un lien/ })).toBeDisabled()
  })

  it('redirects to /challenges when already logged in', async () => {
    renderWithProviders(ui(), { route: '/login', auth: authFor() })
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/challenges'))
  })
})
