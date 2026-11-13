import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DuplicateBanner from '../../src/components/idea/DuplicateBanner'
import type { IdeaDetail } from '../../src/hooks/useIdea'
import { renderWithProviders } from '../helpers/render'
import { resetSupabaseMock } from '../helpers/supabase'
import { makeRawIdea, makeScore, qb, routeTables } from '../f4-idea-detail-scoring/helpers'

vi.mock('../../src/lib/supabase', async () => (await import('../helpers/supabase')).supabaseModuleMock())

beforeEach(() => resetSupabaseMock())

const original = { id: 'orig', external_id: 'IDEA-002' }

function renderBanner(detail: IdeaDetail) {
  return renderWithProviders(<DuplicateBanner challengeId="c1" detail={detail} />, {
    route: '/challenges/c1/ideas/x?q=foo',
  })
}

describe('DuplicateBanner', () => {
  it('links to the original on a duplicate', () => {
    routeTables({})
    const idea = makeRawIdea({ status: 'duplicate', duplicate_of: 'orig' })
    renderBanner({ idea, original, duplicateCount: 0 })
    expect(screen.getByText(/Doublon de/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'IDEA-002' })).toHaveAttribute('href', '/challenges/c1/ideas/orig?q=foo')
  })

  it('shows the duplicate count on an original', () => {
    routeTables({})
    renderBanner({ idea: makeRawIdea(), original: null, duplicateCount: 2 })
    expect(screen.getByText('2 doublons')).toBeInTheDocument()
  })

  it('renders nothing for a plain idea', () => {
    routeTables({})
    const { container } = renderBanner({ idea: makeRawIdea(), original: null, duplicateCount: 0 })
    expect(container.querySelector('p, button, a')).toBeNull()
  })

  it('unflag goes back to new when there is no AI score', async () => {
    const idea = makeRawIdea({ status: 'duplicate', duplicate_of: 'orig' })
    const ideas = qb()
    routeTables({ ideas, scores: qb({ data: [makeScore(idea.id, 'impact')] }) })
    renderBanner({ idea, original, duplicateCount: 0 })
    await userEvent.click(screen.getByRole('button', { name: "Ce n'est pas un doublon" }))
    await waitFor(() => expect(ideas.update).toHaveBeenCalledWith({ duplicate_of: null, status: 'new' }))
    expect(ideas.eq).toHaveBeenCalledWith('id', idea.id)
  })

  it('unflag goes back to ai_scored when an AI score exists', async () => {
    const idea = makeRawIdea({ status: 'duplicate', duplicate_of: 'orig' })
    const ideas = qb()
    routeTables({ ideas, scores: qb({ data: [makeScore(idea.id, 'impact', { ai_score: 3 })] }) })
    renderBanner({ idea, original, duplicateCount: 0 })
    await userEvent.click(screen.getByRole('button', { name: "Ce n'est pas un doublon" }))
    await waitFor(() => expect(ideas.update).toHaveBeenCalledWith({ duplicate_of: null, status: 'ai_scored' }))
  })
})
