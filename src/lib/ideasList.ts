import type { Tables } from './database.types'

export const EMPTY = '__empty__'
export const EMPTY_LABEL = 'Non renseigné'

export type IdeaListItem = Tables<'ideas'> & {
  aiAverage: number | null
  finalAverage: number | null
}

export type SortKey =
  | 'external_id'
  | 'title'
  | 'direction'
  | 'site'
  | 'theme'
  | 'budget_eur'
  | 'aiAverage'
  | 'finalAverage'
  | 'status'
  | 'shortlisted'

export interface IdeaSort {
  key: SortKey
  dir: 'asc' | 'desc'
}

export interface IdeaFilters {
  directions: string[]
  sites: string[]
  themes: string[]
  statuses: string[]
  q: string
  showDuplicates: boolean
  budgetMin: number | null
  budgetMax: number | null
  /** Keep ideas without a parsed budget when a bound is set. */
  budgetIncludeUnknown: boolean
  sort: IdeaSort
}

export type FacetField = 'direction' | 'site' | 'theme'

export const DEFAULT_SORT: IdeaSort = { key: 'external_id', dir: 'asc' }

export const DEFAULT_FILTERS: IdeaFilters = {
  directions: [],
  sites: [],
  themes: [],
  statuses: [],
  q: '',
  showDuplicates: false,
  budgetMin: null,
  budgetMax: null,
  budgetIncludeUnknown: false,
  sort: DEFAULT_SORT,
}

export const SORT_PRESETS: { label: string; sort: IdeaSort }[] = [
  { label: 'Moyenne finale (décroissante)', sort: { key: 'finalAverage', dir: 'desc' } },
  { label: 'Moyenne finale (croissante)', sort: { key: 'finalAverage', dir: 'asc' } },
  { label: 'Moyenne IA (décroissante)', sort: { key: 'aiAverage', dir: 'desc' } },
  { label: 'Moyenne IA (croissante)', sort: { key: 'aiAverage', dir: 'asc' } },
  { label: 'Identifiant', sort: { key: 'external_id', dir: 'asc' } },
]

const SORT_KEYS: SortKey[] = [
  'external_id',
  'title',
  'direction',
  'site',
  'theme',
  'budget_eur',
  'aiAverage',
  'finalAverage',
  'status',
  'shortlisted',
]

export const BUDGET_LABEL = 'Budget estimé'

/** The budget as submitted, or "Non renseigné" when empty. */
export function displayBudget(raw: string | null | undefined): string {
  return raw && raw.trim() ? raw : EMPTY_LABEL
}

function parseBound(v: string | null): number | null {
  if (v == null || v.trim() === '') return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function parseFilters(params: URLSearchParams): IdeaFilters {
  const key = params.get('sort') as SortKey | null
  const dir = params.get('dir')
  return {
    directions: params.getAll('direction'),
    sites: params.getAll('site'),
    themes: params.getAll('theme'),
    statuses: params.getAll('status'),
    q: params.get('q') ?? '',
    showDuplicates: params.get('dup') === '1',
    budgetMin: parseBound(params.get('bmin')),
    budgetMax: parseBound(params.get('bmax')),
    budgetIncludeUnknown: params.get('bnull') === '1',
    sort: {
      key: key && SORT_KEYS.includes(key) ? key : DEFAULT_SORT.key,
      dir: dir === 'desc' ? 'desc' : 'asc',
    },
  }
}

export function serializeFilters(f: IdeaFilters): URLSearchParams {
  const p = new URLSearchParams()
  f.directions.forEach((v) => p.append('direction', v))
  f.sites.forEach((v) => p.append('site', v))
  f.themes.forEach((v) => p.append('theme', v))
  f.statuses.forEach((v) => p.append('status', v))
  if (f.q) p.set('q', f.q)
  if (f.showDuplicates) p.set('dup', '1')
  if (f.budgetMin != null) p.set('bmin', String(f.budgetMin))
  if (f.budgetMax != null) p.set('bmax', String(f.budgetMax))
  if (f.budgetIncludeUnknown) p.set('bnull', '1')
  if (f.sort.key !== DEFAULT_SORT.key) p.set('sort', f.sort.key)
  if (f.sort.dir !== DEFAULT_SORT.dir) p.set('dir', f.sort.dir)
  return p
}

export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

function matchesFacet(selected: string[], value: string | null): boolean {
  if (selected.length === 0) return true
  const v = value?.trim() ?? ''
  return v === '' ? selected.includes(EMPTY) : selected.includes(v)
}

export function applyFilters(items: IdeaListItem[], f: IdeaFilters): IdeaListItem[] {
  const q = normalizeText(f.q.trim())
  return items.filter((i) => {
    if (!f.showDuplicates && i.status === 'duplicate') return false
    if (!matchesFacet(f.directions, i.direction)) return false
    if (!matchesFacet(f.sites, i.site)) return false
    if (!matchesFacet(f.themes, i.theme)) return false
    if (f.statuses.length > 0 && !f.statuses.includes(i.status)) return false
    if (f.budgetMin != null || f.budgetMax != null) {
      if (i.budget_eur == null) {
        if (!f.budgetIncludeUnknown) return false
      } else {
        if (f.budgetMin != null && i.budget_eur < f.budgetMin) return false
        if (f.budgetMax != null && i.budget_eur > f.budgetMax) return false
      }
    }
    if (q && !normalizeText(`${i.title} ${i.description}`).includes(q)) return false
    return true
  })
}

function sortValue(i: IdeaListItem, key: SortKey): string | number | null {
  switch (key) {
    case 'budget_eur':
    case 'aiAverage':
    case 'finalAverage':
      return i[key]
    case 'shortlisted':
      return i.shortlisted ? 1 : 0
    default: {
      const v = i[key]
      return v == null || v === '' ? null : v
    }
  }
}

/** Stable sort; null values always come last regardless of direction. */
export function sortIdeas(items: IdeaListItem[], sort: IdeaSort): IdeaListItem[] {
  const mult = sort.dir === 'asc' ? 1 : -1
  const keyed = items.map((item, index) => ({ item, index, v: sortValue(item, sort.key) }))
  keyed.sort((a, b) => {
    if (a.v == null && b.v == null) return a.index - b.index
    if (a.v == null) return 1
    if (b.v == null) return -1
    let c: number
    if (typeof a.v === 'number' && typeof b.v === 'number') c = a.v - b.v
    else c = String(a.v).localeCompare(String(b.v), 'fr', { numeric: true, sensitivity: 'base' })
    return c === 0 ? a.index - b.index : c * mult
  })
  return keyed.map((k) => k.item)
}

export function facetOptions(items: IdeaListItem[], field: FacetField): string[] {
  const set = new Set<string>()
  let hasEmpty = false
  for (const i of items) {
    const v = i[field]?.trim() ?? ''
    if (v === '') hasEmpty = true
    else set.add(v)
  }
  const out = [...set].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
  if (hasEmpty) out.push(EMPTY)
  return out
}

export function reviewProgress(items: IdeaListItem[]): { reviewed: number; total: number } {
  let reviewed = 0
  let total = 0
  for (const i of items) {
    if (i.status === 'duplicate') continue
    total++
    if (i.status === 'reviewed') reviewed++
  }
  return { reviewed, total }
}

export const STATUS_OPTIONS: { value: IdeaListItem['status']; label: string }[] = [
  { value: 'new', label: 'Nouvelle' },
  { value: 'ai_scored', label: 'Notée IA' },
  { value: 'reviewed', label: 'Évaluée' },
  { value: 'duplicate', label: 'Doublon' },
]

/** Candidates: not shortlisted, not duplicates; final average desc, nulls last. */
export function addCandidates(ideas: IdeaListItem[]): IdeaListItem[] {
  return ideas
    .filter((i) => !i.shortlisted && i.status !== 'duplicate' && !i.duplicate_of)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const x = a.item.finalAverage
      const y = b.item.finalAverage
      if (x == null && y == null) return a.index - b.index
      if (x == null) return 1
      if (y == null) return -1
      return y - x || a.index - b.index
    })
    .map((k) => k.item)
}
