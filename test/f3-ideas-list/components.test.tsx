import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import IdeasTable from '../../src/components/ideas/IdeasTable'
import IdeaFilters from '../../src/components/ideas/IdeaFilters'
import DuplicateBadge from '../../src/components/ideas/DuplicateBadge'
import { applyFilters, parseFilters, serializeFilters, sortIdeas, type IdeaSort } from '../../src/lib/ideasList'
import { makeIdea } from './helpers'

const a = makeIdea({ title: 'Alpha', external_id: 'A', finalAverage: 2, shortlisted: true })
const b = makeIdea({ title: 'Bravo', external_id: 'B', finalAverage: 4, direction: 'RH' })
const dup = makeIdea({ title: 'Charlie', external_id: 'C', status: 'duplicate', duplicate_of: a.id })

function TableHarness() {
  const [sort, setSort] = useState<IdeaSort>({ key: 'external_id', dir: 'asc' })
  const items = sortIdeas([a, b, dup], sort)
  return <IdeasTable challengeId="c1" items={items} allItems={[a, b, dup]} sort={sort} onSortChange={setSort} />
}

describe('IdeasTable', () => {
  it('links titles to the detail page and shows badges', () => {
    render(<MemoryRouter><TableHarness /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Alpha' })).toHaveAttribute('href', `/challenges/c1/ideas/${a.id}`)
    expect(screen.getByText('Shortlist', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Doublon de A' })).toBeInTheDocument()
    expect(screen.getByText('1 doublon')).toBeInTheDocument()
  })

  it('keeps header cells sticky inside a scrolling container', () => {
    render(<MemoryRouter><TableHarness /></MemoryRouter>)
    for (const th of screen.getAllByRole('columnheader')) expect(th.className).toContain('sticky')
    expect(screen.getByRole('table').parentElement?.className).toContain('overflow-auto')
  })

  it('sorts when clicking a header and toggles direction', async () => {
    render(<MemoryRouter><TableHarness /></MemoryRouter>)
    const header = screen.getByRole('columnheader', { name: /Moy\. finale/ })
    expect(header).toHaveAttribute('aria-sort', 'none')
    await userEvent.click(within(header).getByRole('button'))
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    const titles = () => screen.getAllByRole('row').slice(1).map((r) => within(r).queryAllByRole('link')[0].textContent)
    expect(titles()).toEqual(['Alpha', 'Bravo', 'Charlie'])
    await userEvent.click(within(header).getByRole('button'))
    expect(header).toHaveAttribute('aria-sort', 'descending')
    expect(titles()).toEqual(['Bravo', 'Alpha', 'Charlie'])
  })
})

function FiltersHarness({ onParams }: { onParams: (s: string) => void }) {
  const [params, setParams] = useSearchParams()
  onParams(params.toString())
  return (
    <IdeaFilters
      items={[a, b, dup]}
      filters={parseFilters(params)}
      onChange={(f) => setParams(serializeFilters(f), { replace: true })}
    />
  )
}

describe('IdeaFilters', () => {
  it('updates URL params when filters change', async () => {
    const onParams = vi.fn()
    render(<MemoryRouter><FiltersHarness onParams={onParams} /></MemoryRouter>)
    const last = () => new URLSearchParams(onParams.mock.calls.at(-1)![0])

    await userEvent.click(screen.getByText('Direction'))
    await userEvent.click(screen.getByLabelText('RH'))
    expect(last().getAll('direction')).toEqual(['RH'])
    expect(screen.getAllByLabelText('Non renseigné').length).toBeGreaterThan(0)

    await userEvent.type(screen.getByLabelText('Rechercher'), 'abc')
    expect(last().get('q')).toBe('abc')
    await userEvent.click(screen.getByLabelText('Afficher les doublons'))
    expect(last().get('dup')).toBe('1')

    await userEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }))
    expect(last().toString()).toBe('')
    expect(applyFilters([a], parseFilters(last()))).toHaveLength(1)
  })
})

describe('MultiSelect dropdowns', () => {
  const setup = () => render(<MemoryRouter><FiltersHarness onParams={() => {}} /></MemoryRouter>)
  const trigger = (name: string) => screen.getByRole('button', { name })

  it('opens on trigger click and stays open when toggling a checkbox', async () => {
    setup()
    expect(trigger('Direction')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('group', { name: 'Direction' })).not.toBeInTheDocument()
    await userEvent.click(trigger('Direction'))
    expect(trigger('Direction')).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(screen.getByLabelText('RH'))
    expect(screen.getByRole('group', { name: 'Direction' })).toBeInTheDocument()
    expect(trigger('Direction (1)')).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes on outside mousedown', async () => {
    setup()
    await userEvent.click(trigger('Site'))
    await userEvent.click(document.body)
    expect(screen.queryByRole('group', { name: 'Site' })).not.toBeInTheDocument()
    expect(trigger('Site')).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    setup()
    await userEvent.click(trigger('Thème'))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('group', { name: 'Thème' })).not.toBeInTheDocument()
    expect(trigger('Thème')).toHaveFocus()
  })

  it('closes the first dropdown when a second opens', async () => {
    setup()
    await userEvent.click(trigger('Direction'))
    await userEvent.click(trigger('Statut'))
    expect(screen.queryByRole('group', { name: 'Direction' })).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Statut' })).toBeInTheDocument()
    expect(trigger('Direction')).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('Sort select', () => {
  function Combined() {
    const [params, setParams] = useSearchParams()
    const filters = parseFilters(params)
    const items = sortIdeas(applyFilters([a, b], filters), filters.sort)
    return (
      <>
        <span data-testid="qs">{params.toString()}</span>
        <IdeaFilters items={[a, b]} filters={filters} onChange={(f) => setParams(serializeFilters(f), { replace: true })} />
        <IdeasTable
          challengeId="c1"
          items={items}
          allItems={[a, b]}
          sort={filters.sort}
          onSortChange={(sort) => setParams(serializeFilters({ ...filters, sort }), { replace: true })}
        />
      </>
    )
  }
  const titles = () => screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('link')[0].textContent)

  it('updates URL and table order, and syncs with headers', async () => {
    render(<MemoryRouter><Combined /></MemoryRouter>)
    const select = screen.getByLabelText('Trier par') as HTMLSelectElement
    expect(select.selectedOptions[0].textContent).toBe('Identifiant')
    expect(titles()).toEqual(['Alpha', 'Bravo'])

    await userEvent.selectOptions(select, 'Moyenne finale (décroissante)')
    const qs = new URLSearchParams(screen.getByTestId('qs').textContent!)
    expect(qs.get('sort')).toBe('finalAverage')
    expect(qs.get('dir')).toBe('desc')
    expect(titles()).toEqual(['Bravo', 'Alpha'])

    await userEvent.click(within(screen.getByRole('columnheader', { name: /Titre/ })).getByRole('button'))
    expect(select.selectedOptions[0].textContent).toBe('Personnalisé')

    await userEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }))
    expect(screen.getByTestId('qs').textContent).toBe('')
    expect(select.selectedOptions[0].textContent).toBe('Identifiant')
  })
})

describe('DuplicateBadge', () => {
  it('renders nothing for a plain idea', () => {
    const { container } = render(<MemoryRouter><DuplicateBadge challengeId="c1" idea={b} /></MemoryRouter>)
    expect(container).toBeEmptyDOMElement()
  })
  it('pluralises originals', () => {
    render(<MemoryRouter><DuplicateBadge challengeId="c1" idea={a} duplicateCount={3} /></MemoryRouter>)
    expect(screen.getByText('3 doublons')).toBeInTheDocument()
  })
  it('links a duplicate to its original', () => {
    render(<MemoryRouter><DuplicateBadge challengeId="c1" idea={dup} original={a} /></MemoryRouter>)
    expect(screen.getByRole('link')).toHaveAttribute('href', `/challenges/c1/ideas/${a.id}`)
  })
})
