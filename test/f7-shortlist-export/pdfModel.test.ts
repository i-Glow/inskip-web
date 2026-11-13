import { describe, expect, it, vi } from 'vitest'
import { makeRawIdea, makeScore } from '../f4-idea-detail-scoring/helpers'

vi.mock('@react-pdf/renderer', () => ({
  Document: 'div',
  Page: 'div',
  Text: 'span',
  View: 'div',
  StyleSheet: { create: (s: unknown) => s },
  pdf: vi.fn(),
}))

import { buildShortlistPdfModel, shortlistPdfFilename } from '../../src/lib/export/shortlistPdf'

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v)
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out))
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out))
  return out
}

const a = makeRawIdea({ title: 'Alpha', shortlisted: true, shortlist_rank: 2, budget_raw: '5 k€' })
const b = makeRawIdea({ title: 'Beta', shortlisted: true, shortlist_rank: 1, direction: null })
const c = makeRawIdea({ title: 'Gamma' })
const scores = [
  makeScore(a.id, 'impact', { ai_score: 2, final_score: 4, ai_justification: 'ia', final_justification: 'Final A' }),
  makeScore(a.id, 'feasibility', { ai_score: 3, ai_justification: 'Repli' }),
  makeScore(b.id, 'impact', { final_score: 5 }),
  makeScore(c.id, 'impact', { final_score: 1 }),
]

describe('buildShortlistPdfModel', () => {
  const m = buildShortlistPdfModel({ title: 'Défi' }, [a, b, c], scores, new Date('2024-03-05T12:00:00Z'))

  it('builds the cover', () => {
    expect(m.title).toBe('Défi')
    expect(m.count).toBe(2)
    expect(m.dateLabel).toBe('5 mars 2024')
  })

  it('orders the ranking by shortlist rank and excludes others', () => {
    expect(m.ranking.map((r) => [r.rank, r.title])).toEqual([
      [1, 'Beta'],
      [2, 'Alpha'],
    ])
    expect(m.ranking[1].scores).toEqual([4, 3, null, null])
    expect(m.ranking[1].average).toBe(3.5)
    expect(m.ranking[0].direction).toBe('—')
  })

  it('uses final values with fallbacks per criterion', () => {
    const p = m.pages[1]
    expect(p.budget).toBe('5 k€')
    expect(m.ranking[1].budget).toBe('5 k€')
    expect(m.ranking[0].budget).toBe('10 k€')
    expect(buildShortlistPdfModel({ title: 'D' }, [{ ...b, budget_raw: null }], []).pages[0].budget).toBe('Non renseigné')
    expect(p.criteria[0]).toMatchObject({ label: 'Impact', score: 4, justification: 'Final A' })
    expect(p.criteria[1]).toMatchObject({ score: 3, justification: 'Repli' })
    expect(p.criteria[2]).toMatchObject({ score: null, justification: '' })
  })

  it('never mentions AI', () => {
    const all = strings(m)
    expect(all.some((s) => /\bIA\b|\bAI\b|mock/i.test(s))).toBe(false)
  })

  it('names the file after the challenge', () => {
    expect(shortlistPdfFilename('A/B')).toBe('A_B_shortlist.pdf')
  })
})
