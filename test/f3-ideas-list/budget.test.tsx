import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import IdeasTable from '../../src/components/ideas/IdeasTable'
import IdeaFilters from '../../src/components/ideas/IdeaFilters'
import {
  DEFAULT_FILTERS,
  applyFilters,
  displayBudget,
  parseFilters,
  serializeFilters,
} from '../../src/lib/ideasList'
import { makeIdea } from './helpers'

const cheap = makeIdea({ title: 'Cheap', budget_raw: '5 k€', budget_eur: 5000 })
const mid = makeIdea({ title: 'Mid', budget_raw: 'environ 20000', budget_eur: 20000 })
const unknown = makeIdea({ title: 'Unknown', budget_raw: 'à définir', budget_eur: null })
const empty = makeIdea({ title: 'Empty', budget_raw: null, budget_eur: null })
const all = [cheap, mid, unknown, empty]
const titles = (xs: { title: string }[]) => xs.map((i) => i.title)

describe('budget filter', () => {
  it('does nothing without bounds', () => {
    expect(titles(applyFilters(all, DEFAULT_FILTERS))).toEqual(['Cheap', 'Mid', 'Unknown', 'Empty'])
  })

  it('applies inclusive min/max and excludes unknown budgets', () => {
    expect(titles(applyFilters(all, { ...DEFAULT_FILTERS, budgetMin: 5000 }))).toEqual(['Cheap', 'Mid'])
    expect(titles(applyFilters(all, { ...DEFAULT_FILTERS, budgetMax: 5000 }))).toEqual(['Cheap'])
    expect(titles(applyFilters(all, { ...DEFAULT_FILTERS, budgetMin: 6000, budgetMax: 30000 }))).toEqual(['Mid'])
  })

  it('keeps unknown budgets when asked', () => {
    const f = { ...DEFAULT_FILTERS, budgetMin: 6000, budgetIncludeUnknown: true }
    expect(titles(applyFilters(all, f))).toEqual(['Mid', 'Unknown', 'Empty'])
  })

  it('round-trips through bmin/bmax/bnull', () => {
    const f = { ...DEFAULT_FILTERS, budgetMin: 100, budgetMax: 2500.5, budgetIncludeUnknown: true }
    const p = serializeFilters(f)
    expect(p.get('bmin')).toBe('100')
    expect(p.get('bmax')).toBe('2500.5')
    expect(p.get('bnull')).toBe('1')
    expect(parseFilters(p)).toMatchObject({ budgetMin: 100, budgetMax: 2500.5, budgetIncludeUnknown: true })
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('')
    expect(parseFilters(new URLSearchParams('bmin=abc')).budgetMin).toBeNull()
  })

  it('displays the raw text or "Non renseigné"', () => {
    expect(displayBudget('environ 20000')).toBe('environ 20000')
    expect(displayBudget('  ')).toBe('Non renseigné')
    expect(displayBudget(null)).toBe('Non renseigné')
  })
})

function FiltersHarness() {
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)
  return (
    <>
      <IdeaFilters items={all} filters={filters} onChange={(f) => setParams(serializeFilters(f))} />
      <output data-testid="qs">{params.toString()}</output>
    </>
  )
}

describe('budget filter controls', () => {
  it('writes bmin, bmax and bnull to the URL', async () => {
    render(<MemoryRouter><FiltersHarness /></MemoryRouter>)
    await userEvent.type(screen.getByLabelText('Budget min (€)'), '100')
    await userEvent.type(screen.getByLabelText('Budget max (€)'), '900')
    await userEvent.click(screen.getByLabelText('Inclure budgets non renseignés'))
    const qs = screen.getByTestId('qs').textContent
    expect(qs).toContain('bmin=100')
    expect(qs).toContain('bmax=900')
    expect(qs).toContain('bnull=1')
  })
})

describe('IdeasTable budget and title column', () => {
  it('labels the column "Budget estimé" and shows raw text or Non renseigné', () => {
    render(
      <MemoryRouter>
        <IdeasTable
          challengeId="c1"
          items={all}
          allItems={all}
          sort={{ key: 'external_id', dir: 'asc' }}
          onSortChange={() => {}}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('columnheader', { name: /Budget estimé/ })).toBeInTheDocument()
    expect(screen.getByText('environ 20000')).toBeInTheDocument()
    expect(screen.getByText('à définir')).toBeInTheDocument()
    expect(screen.getAllByText('Non renseigné').length).toBeGreaterThanOrEqual(1)
  })

  it('gives the title column a wide, wrapping cell', () => {
    render(
      <MemoryRouter>
        <IdeasTable
          challengeId="c1"
          items={[cheap]}
          allItems={[cheap]}
          sort={{ key: 'external_id', dir: 'asc' }}
          onSortChange={() => {}}
        />
      </MemoryRouter>,
    )
    const th = screen.getByRole('columnheader', { name: /Titre/ })
    expect(th.className).toContain('min-w-[20rem]')
    expect(th.className).not.toContain('whitespace-nowrap')
    expect(screen.getByRole('link', { name: 'Cheap' }).closest('td')!.className).toContain('whitespace-normal')
  })
})
