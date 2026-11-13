import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import CriterionScoreRow from '../../src/components/idea/CriterionScoreRow'
import ScoringPanel from '../../src/components/idea/ScoringPanel'
import IdeaNav from '../../src/components/idea/IdeaNav'
import IdeaContent from '../../src/components/idea/IdeaContent'
import { CRITERIA } from '../../src/lib/criteria'
import { renderWithProviders } from '../helpers/render'
import { resetSupabaseMock } from '../helpers/supabase'
import { makeRawIdea, makeScore, qb, routeTables, supabaseMock } from './helpers'

vi.mock('../../src/lib/supabase', async () => (await import('../helpers/supabase')).supabaseModuleMock())

beforeEach(() => resetSupabaseMock())

const row = (over = {}) => ({
  criterion: 'impact' as const,
  ai_score: 3,
  ai_justification: 'Parce que',
  final_score: 3,
  final_justification: 'Parce que',
  ...over,
})

describe('CriterionScoreRow', () => {
  it('shows the AI suggestion without flag when not overridden', () => {
    renderWithProviders(
      <CriterionScoreRow criterion={CRITERIA[0]} row={row()} onScoreChange={vi.fn()} onJustificationChange={vi.fn()} />,
    )
    expect(screen.getByText('Suggestion IA')).toBeInTheDocument()
    expect(screen.getByText('Parce que', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByText('Modifié')).not.toBeInTheDocument()
    expect(screen.getByTitle(CRITERIA[0].description)).toBeInTheDocument()
  })

  it('flags an overridden score and reports selections', async () => {
    const onScore = vi.fn()
    renderWithProviders(
      <CriterionScoreRow criterion={CRITERIA[0]} row={row({ final_score: 5 })} onScoreChange={onScore} onJustificationChange={vi.fn()} />,
    )
    expect(screen.getByText('Modifié')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '5' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: '2' }))
    expect(onScore).toHaveBeenCalledWith(2)
  })

  it('reports typed justification and handles missing AI suggestion', async () => {
    const onText = vi.fn()
    renderWithProviders(
      <CriterionScoreRow
        criterion={CRITERIA[1]}
        row={row({ criterion: 'feasibility', ai_score: null, ai_justification: null, final_score: null, final_justification: '' })}
        onScoreChange={vi.fn()}
        onJustificationChange={onText}
      />,
    )
    expect(screen.getByText('Pas encore de suggestion IA')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Justification finale/), 'a')
    expect(onText).toHaveBeenCalledWith('a')
  })
})

describe('IdeaContent', () => {
  it('renders fields with fr-FR date and raw budget', () => {
    const idea = makeRawIdea({ title: 'Mon idée', budget_raw: 'environ 10k' })
    renderWithProviders(<IdeaContent idea={idea} />)
    expect(screen.getByRole('heading', { name: 'Mon idée' })).toBeInTheDocument()
    expect(screen.getByText('5 mars 2024')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('environ 10k')).toBeInTheDocument()
    expect(screen.getByText('Gain de temps')).toBeInTheDocument()
  })
})

describe('ScoringPanel', () => {
  function setup(over = {}) {
    const idea = makeRawIdea({ status: 'ai_scored', ...over })
    const scores = qb({
      data: [makeScore(idea.id, 'impact', { ai_score: 4 }), makeScore(idea.id, 'innovation', { ai_score: 2 })],
    })
    const ideas = qb({ data: [{ shortlist_rank: 2 }] })
    routeTables({ scores, ideas })
    renderWithProviders(<ScoringPanel idea={idea} />)
    return { idea, scores, ideas }
  }

  it('shows the computed average', async () => {
    setup()
    expect(await screen.findByText('3,0')).toBeInTheDocument()
  })

  it('Valider sets status to reviewed', async () => {
    const { idea, ideas } = setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Valider' }))
    await waitFor(() => expect(ideas.update).toHaveBeenCalledWith({ status: 'reviewed' }))
    expect(ideas.eq).toHaveBeenCalledWith('id', idea.id)
  })

  it('toggles the shortlist with the next rank', async () => {
    const { ideas } = setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Ajouter à la shortlist' }))
    await waitFor(() => expect(ideas.update).toHaveBeenCalledWith({ shortlisted: true, shortlist_rank: 3 }))
  })

  it('offers removal when shortlisted', async () => {
    const { ideas } = setup({ shortlisted: true, shortlist_rank: 1 })
    await userEvent.click(await screen.findByRole('button', { name: 'Retirer de la shortlist' }))
    await waitFor(() => expect(ideas.update).toHaveBeenCalledWith({ shortlisted: false, shortlist_rank: null }))
  })

  it('disables the shortlist button for duplicates with an explanation', async () => {
    setup({ status: 'duplicate', duplicate_of: 'other' })
    expect(await screen.findByRole('button', { name: 'Ajouter à la shortlist' })).toBeDisabled()
    expect(screen.getByText(/ne peut pas être ajoutée à la shortlist/)).toBeInTheDocument()
  })
})

describe('IdeaNav', () => {
  const a = makeRawIdea({ external_id: 'A', title: 'Alpha', direction: 'RH' })
  const b = makeRawIdea({ external_id: 'B', title: 'Bravo', direction: 'IT' })
  const c = makeRawIdea({ external_id: 'C', title: 'Charlie', direction: 'RH' })
  const d = makeRawIdea({ external_id: 'D', title: 'Delta', direction: 'RH', status: 'duplicate' })

  function renderNav(route: string, ideaId: string) {
    routeTables({ ideas: qb({ data: [a, b, c, d] }), idea_averages: qb({ data: [] }) })
    return renderWithProviders(
      <Routes>
        <Route path="/challenges/:id/ideas/:ideaId" element={<IdeaNav challengeId="c1" ideaId={ideaId} />} />
      </Routes>,
      { route },
    )
  }

  it('walks the list in default order and preserves the query string', async () => {
    renderNav(`/challenges/c1/ideas/${b.id}?q=a`, b.id)
    // q=a matches Alpha, Bravo, Charlie (description "Description"): all visible, duplicates hidden
    expect(await screen.findByText('2 / 3')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Précédente' })).toHaveAttribute('href', `/challenges/c1/ideas/${a.id}?q=a`)
    expect(screen.getByRole('link', { name: 'Suivante' })).toHaveAttribute('href', `/challenges/c1/ideas/${c.id}?q=a`)
    expect(screen.getByRole('link', { name: 'Retour à la liste' })).toHaveAttribute('href', '/challenges/c1/ideas?q=a')
  })

  it('respects filters and sort', async () => {
    renderNav(`/challenges/c1/ideas/${c.id}?direction=RH&sort=external_id&dir=desc`, c.id)
    expect(await screen.findByText('1 / 2')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Précédente' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Suivante' })).toHaveAttribute(
      'href',
      expect.stringContaining(`/ideas/${a.id}?`),
    )
  })

  it('disables next at the end of the list', async () => {
    renderNav(`/challenges/c1/ideas/${c.id}`, c.id)
    expect(await screen.findByText('3 / 3')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Suivante' })).not.toBeInTheDocument()
    expect(screen.getByText('Suivante')).toHaveAttribute('aria-disabled', 'true')
    expect(supabaseMock.from).toHaveBeenCalledWith('ideas')
  })
})
