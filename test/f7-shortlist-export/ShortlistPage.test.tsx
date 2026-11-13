import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../helpers/render'
import { makeIdea } from '../f3-ideas-list/helpers'

const suggest = vi.fn()
const toggle = vi.fn()
const reorder = vi.fn()
let ideas: ReturnType<typeof makeIdea>[] = []

vi.mock('../../src/hooks/useIdeas', () => ({
  useChallenge: () => ({ data: { id: 'c1', title: 'Défi' } }),
  useIdeas: () => ({ data: ideas, isLoading: false, isError: false }),
}))
vi.mock('../../src/hooks/useShortlist', () => ({
  DEFAULT_SHORTLIST_TARGET: 8,
  useShortlist: () => ({
    toggleShortlist: { mutate: toggle },
    reorder: { mutate: reorder },
    suggest: { mutate: suggest, isPending: false },
  }),
}))
vi.mock('../../src/components/shortlist/ExportButtons', () => ({ default: () => <div>exports</div> }))

import ShortlistPage from '../../src/pages/ShortlistPage'

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/challenges/:id/shortlist" element={<ShortlistPage />} />
    </Routes>,
    { route: '/challenges/c1/shortlist' },
  )

function shortlisted(n: number, unreviewed = 0) {
  return Array.from({ length: n }, (_, i) =>
    makeIdea({
      status: i < unreviewed ? 'ai_scored' : 'reviewed',
      shortlisted: true,
      shortlist_rank: i + 1,
    }),
  )
}

beforeEach(() => {
  suggest.mockReset()
  ideas = []
})

describe('ShortlistPage', () => {
  it('shows the empty state and suggests directly', () => {
    ideas = [makeIdea({ status: 'reviewed' })]
    renderPage()
    expect(screen.getByText('Aucune idée dans la shortlist')).toBeInTheDocument()
    expect(screen.getByTestId('shortlist-counter')).toHaveTextContent('0 / 8')
    fireEvent.click(screen.getByRole('button', { name: 'Suggérer' }))
    expect(suggest).toHaveBeenCalledWith({ challengeId: 'c1', target: 8 }, expect.anything())
  })

  it('shows counter and unreviewed warning', () => {
    ideas = shortlisted(7, 2)
    renderPage()
    expect(screen.getByTestId('shortlist-counter')).toHaveTextContent('7 / 8')
    expect(screen.getByRole('alert')).toHaveTextContent('2 idées de la shortlist ne sont pas encore évaluées')
    expect(screen.getByRole('link', { name: 'Retour aux idées' })).toHaveAttribute('href', '/challenges/c1/ideas')
  })

  it('asks for confirmation before replacing a non-empty shortlist', () => {
    ideas = shortlisted(3)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Suggérer' }))
    expect(suggest).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Remplacer' }))
    expect(suggest).toHaveBeenCalledTimes(1)
  })

  it('does not suggest when cancelled', () => {
    ideas = shortlisted(1)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Suggérer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(suggest).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('removes via toggle', () => {
    ideas = shortlisted(2)
    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Retirer' })[0])
    expect(toggle).toHaveBeenCalledWith(ideas[0], expect.anything())
  })
})
