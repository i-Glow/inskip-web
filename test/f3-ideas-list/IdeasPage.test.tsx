import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import IdeasPage from '../../src/pages/IdeasPage'
import { renderWithProviders } from '../helpers/render'
import { queryBuilder, resetSupabaseMock, supabaseMock } from '../helpers/supabase'
import { makeIdea } from './helpers'

vi.mock('../../src/lib/supabase', async () => (await import('../helpers/supabase')).supabaseModuleMock())

const rh = makeIdea({ title: 'Idée RH', direction: 'RH', status: 'reviewed' })
const it1 = makeIdea({ title: 'Idée IT', direction: 'IT' })
const dup = makeIdea({ title: 'Idée copie', direction: 'IT', status: 'duplicate', duplicate_of: it1.id })

beforeEach(() => {
  resetSupabaseMock()
  supabaseMock.from.mockImplementation((t: string) => {
    if (t === 'ideas') return queryBuilder({ data: [rh, it1, dup] })
    if (t === 'idea_averages') return queryBuilder({ data: [{ idea_id: rh.id, ai_average: 3, final_average: 4.26 }] })
    return queryBuilder({ data: { id: 'c1', title: 'Mon challenge' } })
  })
})

const renderPage = (qs = '') =>
  renderWithProviders(
    <Routes><Route path="/challenges/:id/ideas" element={<IdeasPage />} /></Routes>,
    { route: `/challenges/c1/ideas${qs}` },
  )

describe('IdeasPage', () => {
  it('renders rows, title, progress and AI action', async () => {
    renderPage()
    expect(await screen.findByText('Idée RH')).toBeInTheDocument()
    expect(screen.getByText('Idée IT')).toBeInTheDocument()
    expect(screen.queryByText('Idée copie')).not.toBeInTheDocument()
    expect(await screen.findByText('Mon challenge')).toBeInTheDocument()
    expect(screen.getByText('1 / 2 idées évaluées')).toBeInTheDocument()
    expect(screen.getByText('4,3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lancer la notation IA' })).toBeEnabled()
    expect(screen.getByRole('link', { name: 'Voir la shortlist' })).toHaveAttribute('href', '/challenges/c1/shortlist')
  })

  it('filters by direction from the URL', async () => {
    renderPage('?direction=RH')
    expect(await screen.findByText('Idée RH')).toBeInTheDocument()
    expect(screen.queryByText('Idée IT')).not.toBeInTheDocument()
    expect(screen.getByText(/1 idée affichée sur 3/)).toBeInTheDocument()
  })

  it('shows an empty state when nothing matches', async () => {
    renderPage('?q=zzzz')
    expect(await screen.findByText('Aucune idée ne correspond aux filtres')).toBeInTheDocument()
  })

  it('toggles duplicates', async () => {
    renderPage()
    await screen.findByText('Idée RH')
    await userEvent.click(screen.getByLabelText('Afficher les doublons'))
    await waitFor(() => expect(screen.getByText('Idée copie')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Doublon de ' + it1.external_id })).toBeInTheDocument()
  })

  it('shows an error', async () => {
    supabaseMock.from.mockImplementation(() => queryBuilder({ error: { message: 'x' } }))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger les idées.')
  })
})
