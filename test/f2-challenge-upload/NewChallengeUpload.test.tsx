import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewChallengeUpload from '../../src/components/challenges/NewChallengeUpload'
import { LocationProbe, renderWithProviders } from '../helpers/render'
import { readFixture } from '../helpers/fixtures'
import { queryBuilder, resetSupabaseMock, supabaseMock } from '../helpers/supabase'

vi.mock('../../src/lib/supabase', async () => (await import('../helpers/supabase')).supabaseModuleMock())

function ui() {
  return (
    <>
      <Routes>
        <Route path="/challenges" element={<NewChallengeUpload />} />
        <Route path="/challenges/:id/ideas" element={<p>ideas page</p>} />
      </Routes>
      <LocationProbe />
    </>
  )
}

const upload = (file: File) =>
  userEvent.upload(screen.getByTestId('challenge-file-input'), file)

beforeEach(() => {
  resetSupabaseMock()
})

describe('NewChallengeUpload', () => {
  it('toasts the import summary and navigates to the ideas page', async () => {
    supabaseMock.from.mockImplementation((t: string) =>
      t === 'ideas' ? queryBuilder() : queryBuilder({ data: { id: 'ch-9' } }),
    )
    supabaseMock.rpc.mockResolvedValue({ data: 1, error: null })
    renderWithProviders(ui(), { route: '/challenges' })

    await upload(new File([readFixture('idees_hexavia.csv')], 'idees_hexavia.csv'))

    expect(await screen.findByText('40 idées importées, 1 doublon détecté')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/challenges/ch-9/ideas'),
    )
  })

  it('shows the error message when the import fails', async () => {
    renderWithProviders(ui(), { route: '/challenges' })
    await upload(new File(['id;prenom\nA;Jo\n'], 'bad.csv'))

    const msg = 'Colonnes obligatoires manquantes : titre, description'
    expect(await screen.findByRole('alert')).toHaveTextContent(msg)
    expect(screen.getByRole('status')).toHaveTextContent(msg)
    expect(screen.getByTestId('location')).toHaveTextContent('/challenges')
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })
})
