import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChallengeCard from '../../src/components/challenges/ChallengeCard'
import type { ChallengeSummary } from '../../src/hooks/useChallenges'
import { renderWithProviders } from '../helpers/render'
import { queryBuilder, resetSupabaseMock, supabaseMock } from '../helpers/supabase'

vi.mock('../../src/lib/supabase', async () => (await import('../helpers/supabase')).supabaseModuleMock())

const challenge: ChallengeSummary = {
  id: 'c1',
  title: 'Hexavia',
  source_filename: 'h.csv',
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-02T10:00:00Z',
  ideaCount: 40,
  reviewedPct: 25,
}

const card = () => renderWithProviders(<ul><ChallengeCard challenge={challenge} /></ul>)

beforeEach(() => {
  resetSupabaseMock()
})

describe('ChallengeCard', () => {
  it('shows title, counts, percentage and link to ideas', () => {
    card()
    expect(screen.getByText('Hexavia')).toBeInTheDocument()
    expect(screen.getByText(/40 idées · 25 % évaluées/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ouvrir' })).toHaveAttribute(
      'href',
      '/challenges/c1/ideas',
    )
  })

  it('asks for confirmation before deleting', async () => {
    const b = queryBuilder()
    supabaseMock.from.mockReturnValue(b)
    card()

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Supprimer ce challenge et toutes ses idées et évaluations ?')
    expect(b.delete).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(b.delete).toHaveBeenCalledOnce())
    expect(b.eq).toHaveBeenCalledWith('id', 'c1')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('does not delete when cancelled', async () => {
    const b = queryBuilder()
    supabaseMock.from.mockReturnValue(b)
    card()
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(b.delete).not.toHaveBeenCalled()
  })

  it('toasts a French error when deletion fails', async () => {
    supabaseMock.from.mockReturnValue(queryBuilder({ error: { message: 'x' } }))
    card()
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Supprimer' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Impossible de supprimer le challenge.')
  })

  it('renames through the editable title', async () => {
    const b = queryBuilder()
    supabaseMock.from.mockReturnValue(b)
    card()
    await userEvent.click(screen.getByRole('button', { name: /Modifier le titre/ }))
    const input = screen.getByLabelText('Titre du challenge')
    await userEvent.clear(input)
    await userEvent.type(input, 'Renommé{Enter}')
    await waitFor(() => expect(b.update).toHaveBeenCalledWith({ title: 'Renommé' }))
  })
})
