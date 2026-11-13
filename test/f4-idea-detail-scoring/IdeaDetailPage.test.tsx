import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import IdeaDetailPage from '../../src/pages/IdeaDetailPage'
import { renderWithProviders } from '../helpers/render'
import { resetSupabaseMock } from '../helpers/supabase'
import { makeRawIdea, makeScore, qb, routeTables } from './helpers'

vi.mock('../../src/lib/supabase', async () => (await import('../helpers/supabase')).supabaseModuleMock())

beforeEach(() => resetSupabaseMock())

function renderPage(ideaId: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/challenges/:id/ideas/:ideaId" element={<IdeaDetailPage />} />
    </Routes>,
    { route: `/challenges/c1/ideas/${ideaId}` },
  )
}

describe('IdeaDetailPage', () => {
  it('renders content and scoring side by side', async () => {
    const idea = makeRawIdea({ title: 'Capteurs compresseurs' })
    const ideas = qb({ data: [idea] })
    ideas.maybeSingle.mockReturnValue(qb({ data: idea }))
    routeTables({
      ideas,
      scores: qb({ data: [makeScore(idea.id, 'impact', { ai_score: 4, ai_justification: 'Top' })] }),
      idea_averages: qb({ data: [] }),
    })
    renderPage(idea.id)
    expect(await screen.findByRole('heading', { name: 'Capteurs compresseurs' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Valider' })).toBeInTheDocument()
    expect(screen.getByText('Top', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour à la liste' })).toBeInTheDocument()
  })

  it('shows a breadcrumb back to the challenges and the list', async () => {
    const idea = makeRawIdea({ title: 'Capteurs' })
    const ideas = qb({ data: [idea] })
    ideas.maybeSingle.mockReturnValue(qb({ data: idea }))
    const challenges = qb({ data: { id: 'c1', title: 'Défi 2026' } })
    challenges.maybeSingle.mockReturnValue(qb({ data: { id: 'c1', title: 'Défi 2026' } }))
    routeTables({ ideas, challenges, scores: qb({ data: [] }), idea_averages: qb({ data: [] }) })
    renderWithProviders(
      <Routes>
        <Route path="/challenges/:id/ideas/:ideaId" element={<IdeaDetailPage />} />
      </Routes>,
      { route: `/challenges/c1/ideas/${idea.id}?q=abc` },
    )
    const crumb = await screen.findByRole('navigation', { name: "Fil d'Ariane" })
    expect(within(crumb).getByRole('link', { name: 'Mes challenges' })).toHaveAttribute('href', '/challenges')
    expect(await within(crumb).findByRole('link', { name: 'Défi 2026' })).toHaveAttribute(
      'href',
      '/challenges/c1/ideas?q=abc',
    )
  })

  it('shows not-found and error states', async () => {
    const ideas = qb()
    ideas.maybeSingle.mockReturnValue(qb({ data: null }))
    routeTables({ ideas })
    const { unmount } = renderPage('nope')
    expect(await screen.findByText('Idée introuvable')).toBeInTheDocument()
    unmount()

    const bad = qb()
    bad.maybeSingle.mockReturnValue(qb({ error: { message: 'x' } }))
    routeTables({ ideas: bad })
    renderPage('nope')
    expect(await screen.findByRole('alert')).toHaveTextContent(/Impossible de charger/)
  })
})
