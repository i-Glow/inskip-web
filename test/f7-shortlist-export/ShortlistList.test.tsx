import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../helpers/render'
import { makeIdea } from '../f3-ideas-list/helpers'

let onDragEnd: ((e: unknown) => void) | undefined
vi.mock('@dnd-kit/core', async (orig) => {
  const mod = await orig<typeof import('@dnd-kit/core')>()
  return {
    ...mod,
    DndContext: (props: { onDragEnd: (e: unknown) => void; children: React.ReactNode }) => {
      onDragEnd = props.onDragEnd
      return <mod.DndContext {...(props as object)} />
    },
  }
})

import ShortlistList from '../../src/components/shortlist/ShortlistList'

const items = [
  makeIdea({ title: 'Un', status: 'reviewed', finalAverage: 4.5, shortlisted: true, shortlist_rank: 1 }),
  makeIdea({ title: 'Deux', status: 'ai_scored', shortlisted: true, shortlist_rank: 2 }),
  makeIdea({ title: 'Trois', status: 'reviewed', shortlisted: true, shortlist_rank: 3 }),
]

describe('ShortlistList', () => {
  it('renders in order with an unreviewed badge', () => {
    renderWithProviders(<ShortlistList challengeId="c1" items={items} onReorder={vi.fn()} onRemove={vi.fn()} />)
    const links = screen.getAllByRole('link').map((l) => l.textContent)
    expect(links).toEqual(['Un', 'Deux', 'Trois'])
    expect(screen.getAllByText('Non évaluée')).toHaveLength(1)
    expect(screen.getByText('4,5')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Un' })).toHaveAttribute('href', `/challenges/c1/ideas/${items[0].id}`)
  })

  it('calls onRemove', () => {
    const onRemove = vi.fn()
    renderWithProviders(<ShortlistList challengeId="c1" items={items} onReorder={vi.fn()} onRemove={onRemove} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Retirer' })[1])
    expect(onRemove).toHaveBeenCalledWith(items[1])
  })

  it('reorders on drag end', () => {
    const onReorder = vi.fn()
    renderWithProviders(<ShortlistList challengeId="c1" items={items} onReorder={onReorder} onRemove={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Retirer' })[0]) // no-op, ensure mounted
    onDragEnd!({ active: { id: items[2].id }, over: { id: items[0].id } })
    return screen.findAllByRole('link').then(() => {
      expect(onReorder).toHaveBeenCalledWith([items[2].id, items[0].id, items[1].id])
    })
  })
})
