import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS,
  EMPTY,
  applyFilters,
  facetOptions,
  parseFilters,
  reviewProgress,
  serializeFilters,
  sortIdeas,
  type IdeaFilters,
} from '../../src/lib/ideasList'
import { formatAverage } from '../../src/lib/scoring'
import { makeIdea } from './helpers'

const f = (over: Partial<IdeaFilters> = {}): IdeaFilters => ({ ...DEFAULT_FILTERS, ...over })

describe('scoring', () => {
  it('formats averages in fr-FR', () => {
    expect(formatAverage(3.456)).toBe('3,5')
    expect(formatAverage(4)).toBe('4,0')
    expect(formatAverage(null)).toBe('—')
  })
})

describe('filters <-> URL', () => {
  it('omits defaults', () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('')
  })
  it('round-trips', () => {
    const filters = f({
      directions: ['RH', EMPTY],
      sites: ['Lyon'],
      themes: ['A', 'B'],
      statuses: ['new'],
      q: 'énergie',
      showDuplicates: true,
      sort: { key: 'finalAverage', dir: 'desc' },
    })
    const params = serializeFilters(filters)
    expect(params.getAll('theme')).toEqual(['A', 'B'])
    expect(parseFilters(new URLSearchParams(params.toString()))).toEqual(filters)
  })
  it('ignores invalid sort key and legacy min/max params', () => {
    const p = parseFilters(new URLSearchParams('sort=bogus&min=3&max=4'))
    expect(p.sort.key).toBe('external_id')
    expect(p).toEqual(DEFAULT_FILTERS)
    expect(serializeFilters(p).toString()).toBe('')
  })
})

describe('applyFilters', () => {
  const items = [
    makeIdea({ direction: 'RH', title: 'Café équitable', finalAverage: 4 }),
    makeIdea({ direction: 'IT', site: 'Lyon', description: 'Solaire', finalAverage: 2 }),
    makeIdea({ direction: null, theme: ' ' }),
    makeIdea({ direction: 'RH', status: 'duplicate' }),
  ]
  it('hides duplicates by default', () => {
    expect(applyFilters(items, f())).toHaveLength(3)
    expect(applyFilters(items, f({ showDuplicates: true }))).toHaveLength(4)
  })
  it('filters by direction, multi and Non renseigné', () => {
    expect(applyFilters(items, f({ directions: ['RH'] }))).toHaveLength(1)
    expect(applyFilters(items, f({ directions: ['RH', 'IT'] }))).toHaveLength(2)
    expect(applyFilters(items, f({ directions: [EMPTY] }))).toEqual([items[2]])
    expect(applyFilters(items, f({ themes: [EMPTY] }))).toHaveLength(3)
  })
  it('filters by site and status', () => {
    expect(applyFilters(items, f({ sites: ['Lyon'] }))).toEqual([items[1]])
    expect(applyFilters(items, f({ statuses: ['duplicate'], showDuplicates: true }))).toEqual([items[3]])
  })
  it('searches case- and accent-insensitively on title and description', () => {
    expect(applyFilters(items, f({ q: 'CAFE EQUITABLE' }))).toEqual([items[0]])
    expect(applyFilters(items, f({ q: 'solaire' }))).toEqual([items[1]])
  })
  it('does not filter on scores (min/max params are ignored)', () => {
    const parsed = parseFilters(new URLSearchParams('min=3&max=3'))
    expect(applyFilters(items, parsed)).toHaveLength(3)
  })
})

describe('sortIdeas', () => {
  const a = makeIdea({ budget_eur: 100, aiAverage: 2, finalAverage: 3 })
  const b = makeIdea({ budget_eur: null, aiAverage: null, finalAverage: null })
  const c = makeIdea({ budget_eur: 50, aiAverage: 4, finalAverage: 1 })
  const d = makeIdea({ budget_eur: null })
  it('budget: nulls last both directions, stable', () => {
    const asc = sortIdeas([a, b, c, d], { key: 'budget_eur', dir: 'asc' })
    expect(asc).toEqual([c, a, b, d])
    const desc = sortIdeas([a, b, c, d], { key: 'budget_eur', dir: 'desc' })
    expect(desc).toEqual([a, c, b, d])
  })
  it('average sort puts nulls last', () => {
    expect(sortIdeas([b, a, c], { key: 'finalAverage', dir: 'desc' })).toEqual([a, c, b])
    expect(sortIdeas([b, a, c], { key: 'aiAverage', dir: 'asc' })).toEqual([a, c, b])
  })
  it('sorts ids naturally and does not mutate input', () => {
    const x = makeIdea({ external_id: 'IDEA-10' })
    const y = makeIdea({ external_id: 'IDEA-2' })
    const input = [x, y]
    expect(sortIdeas(input, { key: 'external_id', dir: 'asc' })).toEqual([y, x])
    expect(input).toEqual([x, y])
  })
})

describe('facetOptions / reviewProgress', () => {
  it('lists distinct sorted values with Non renseigné last', () => {
    const items = [
      makeIdea({ direction: 'RH' }),
      makeIdea({ direction: null }),
      makeIdea({ direction: 'Achats' }),
      makeIdea({ direction: 'RH' }),
    ]
    expect(facetOptions(items, 'direction')).toEqual(['Achats', 'RH', EMPTY])
    expect(facetOptions(items, 'site')).toEqual([EMPTY])
  })
  it('counts reviewed over non-duplicates', () => {
    const items = [
      makeIdea({ status: 'reviewed' }),
      makeIdea({ status: 'new' }),
      makeIdea({ status: 'duplicate' }),
    ]
    expect(reviewProgress(items)).toEqual({ reviewed: 1, total: 2 })
  })
})

describe('performance', () => {
  it('filters and sorts 200 ideas quickly', () => {
    const items = Array.from({ length: 200 }, (_, i) =>
      makeIdea({ direction: i % 2 ? 'RH' : 'IT', finalAverage: (i % 50) / 10 }),
    )
    const t = performance.now()
    sortIdeas(applyFilters(items, f({ directions: ['RH'], q: 'idée' })), {
      key: 'finalAverage',
      dir: 'desc',
    })
    expect(performance.now() - t).toBeLessThan(50)
  })
})
