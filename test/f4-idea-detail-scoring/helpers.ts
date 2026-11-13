import { vi } from 'vitest'
import type { Tables } from '../../src/lib/database.types'
import { queryBuilder, supabaseMock } from '../helpers/supabase'

export { queryBuilder, supabaseMock }

/** queryBuilder plus the PostgREST methods F4/F6 use that the shared helper lacks. */
export function qb(result: { data?: unknown; error?: unknown } = {}) {
  const b = queryBuilder(result)
  for (const m of ['upsert', 'maybeSingle', 'not', 'limit', 'neq']) {
    ;(b as Record<string, unknown>)[m] = vi.fn(() => b)
  }
  return b
}

/** Route supabase.from(table) to the given builders (default: empty result). */
export function routeTables(tables: Record<string, ReturnType<typeof qb>>) {
  supabaseMock.from.mockImplementation((t: string) => tables[t] ?? qb())
}

let n = 0
export function makeRawIdea(over: Partial<Tables<'ideas'>> = {}): Tables<'ideas'> {
  n++
  return {
    id: `idea-${n}`,
    challenge_id: 'c1',
    external_id: `IDEA-${String(n).padStart(3, '0')}`,
    title: `Idée ${n}`,
    description: `Description ${n}`,
    direction: 'RH',
    site: 'Lyon',
    theme: 'Digital',
    budget_raw: '10 k€',
    budget_eur: 10000,
    status: 'new',
    duplicate_of: null,
    shortlisted: false,
    shortlist_rank: null,
    author_first_name: 'Ada',
    author_last_name: 'Lovelace',
    content_key: null,
    created_at: null,
    expected_benefits: 'Gain de temps',
    submitted_on: '2024-03-05',
    submitted_on_raw: '05/03/2024',
    updated_at: null,
    ...over,
  }
}

export function makeScore(
  ideaId: string,
  criterion: Tables<'scores'>['criterion'],
  over: Partial<Tables<'scores'>> = {},
): Tables<'scores'> {
  return {
    id: `s-${ideaId}-${criterion}`,
    idea_id: ideaId,
    criterion,
    ai_score: null,
    ai_justification: null,
    ai_model: null,
    ai_generated_at: null,
    final_score: null,
    final_justification: null,
    updated_at: null,
    ...over,
  }
}
