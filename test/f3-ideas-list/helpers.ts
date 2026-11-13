import type { IdeaListItem } from '../../src/lib/ideasList'

let n = 0
export function makeIdea(over: Partial<IdeaListItem> = {}): IdeaListItem {
  n++
  return {
    id: `id-${n}`,
    challenge_id: 'c1',
    external_id: `ID-${n}`,
    title: `Idée ${n}`,
    description: `Description ${n}`,
    direction: null,
    site: null,
    theme: null,
    budget_raw: null,
    budget_eur: null,
    status: 'new',
    duplicate_of: null,
    shortlisted: false,
    shortlist_rank: null,
    author_first_name: null,
    author_last_name: null,
    content_key: null,
    created_at: null,
    expected_benefits: null,
    submitted_on: null,
    submitted_on_raw: null,
    updated_at: null,
    aiAverage: null,
    finalAverage: null,
    ...over,
  }
}
