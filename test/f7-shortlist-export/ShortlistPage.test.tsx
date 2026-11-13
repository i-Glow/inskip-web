import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../helpers/render'
import { makeIdea } from '../f3-ideas-list/helpers'

const suggest = vi.fn()
const toggle = vi.fn()
const reorder = vi.fn()
const addIdeas = vi.fn()
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
    addIdeas: { mutate: addIdeas, isPending: false },
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
  addIdeas.mockReset()
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

  it('links back to the challenges list', () => {
    renderPage()
    expect(screen.getByRole('link', { name: '← Mes challenges' })).toHaveAttribute('href', '/challenges')
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

  describe('Ajouter des idées', () => {
    const mk = () => {
      const sl = makeIdea({ external_id: 'S-1', title: 'Déjà', status: 'reviewed', shortlisted: true, shortlist_rank: 1 })
      const dup = makeIdea({ external_id: 'D-1', title: 'Doublon', status: 'duplicate', duplicate_of: sl.id })
      const low = makeIdea({ external_id: 'L-1', title: 'Faible', status: 'reviewed', finalAverage: 2 })
      const none = makeIdea({ external_id: 'N-1', title: 'Sans note', status: 'new' })
      const high = makeIdea({ external_id: 'H-1', title: 'Excellente idée', status: 'reviewed', finalAverage: 4.5 })
      ideas = [sl, dup, low, none, high]
    }

    it('lists candidates sorted by final average desc, nulls last, without shortlisted or duplicates', () => {
      mk()
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: 'Ajouter des idées' }))
      const dialog = screen.getByRole('dialog')
      const rows = within(dialog).getAllByRole('row').slice(1)
      expect(rows.map((r) => within(r).getAllByRole('cell')[1].textContent)).toEqual(['H-1', 'L-1', 'N-1'])
      expect(within(rows[0]).getByText('4,5')).toBeInTheDocument()
      expect(within(rows[2]).getByText('—')).toBeInTheDocument()
      expect(within(rows[2]).getByText('Non évaluée')).toBeInTheDocument()
      expect(within(dialog).queryByText('Doublon')).toBeNull()
      expect(within(dialog).queryByText('Déjà')).toBeNull()
    })

    it('searches by id or title', () => {
      mk()
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: 'Ajouter des idées' }))
      fireEvent.change(screen.getByLabelText('Rechercher une idée'), { target: { value: 'l-1' } })
      expect(screen.getAllByRole('row')).toHaveLength(2)
      fireEvent.change(screen.getByLabelText('Rechercher une idée'), { target: { value: 'excellente' } })
      expect(screen.getByText('Excellente idée')).toBeInTheDocument()
    })

    it('adds the selection in display order, then closes and toasts', () => {
      mk()
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: 'Ajouter des idées' }))
      expect(screen.getByRole('button', { name: 'Ajouter (0)' })).toBeDisabled()
      fireEvent.click(screen.getByLabelText('Sélectionner L-1'))
      fireEvent.click(screen.getByLabelText('Sélectionner H-1'))
      fireEvent.click(screen.getByRole('button', { name: 'Ajouter (2)' }))
      expect(addIdeas).toHaveBeenCalledWith(
        { challengeId: 'c1', orderedIds: [ideas[4].id, ideas[2].id] },
        expect.anything(),
      )
      const opts = addIdeas.mock.calls[0][1]
      opts.onSuccess()
      return screen.findByText('2 idée(s) ajoutée(s) à la shortlist')
    })
  })
})
