import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  MOCK_DELAY_RANGE_MS,
  mockDelayMs,
  mockScore,
  type MockIdea,
} from '../../supabase/functions/_shared/mockScorer'

const LONG = 'x'.repeat(200)
const full = (over: Partial<MockIdea> = {}): MockIdea => ({
  id: 'idea-1',
  title: 'T',
  description: LONG,
  direction: 'Direction RH',
  theme: 'Qualité de vie',
  expected_benefits: 'Gain de temps',
  budget_eur: 12000,
  ...over,
})
const byCrit = (i: MockIdea) =>
  Object.fromEntries(mockScore(i).scores.map((s) => [s.criterion, s]))

// Test-side copy of _shared/schema.ts (the function's schema stays the source of truth).
const schema = z.object({
  scores: z
    .array(
      z.object({
        criterion: z.enum(['impact', 'feasibility', 'alignment', 'innovation']),
        score: z.number().int().min(1).max(5),
        justification: z.string().trim().min(1),
      }),
    )
    .length(4),
})

describe('mockScore', () => {
  it('is deterministic for the same id', () => {
    expect(mockScore(full())).toEqual(mockScore(full()))
  })

  it('differs across ids', () => {
    const seen = new Set(
      Array.from({ length: 30 }, (_, n) => JSON.stringify(mockScore(full({ id: `id-${n}` })))),
    )
    expect(seen.size).toBeGreaterThan(5)
  })

  it('returns 4 criteria with integer scores 1-5 and non-empty justifications', () => {
    for (let n = 0; n < 200; n++) {
      const idea = full({
        id: `r-${n}`,
        expected_benefits: n % 2 ? null : 'b',
        description: n % 3 ? 'court' : LONG,
        budget_eur: n % 5 ? null : 100,
      })
      const res = mockScore(idea)
      expect(schema.safeParse(res).success).toBe(true)
      expect(res.scores.map((s) => s.criterion)).toEqual([
        'impact',
        'feasibility',
        'alignment',
        'innovation',
      ])
    }
  })

  it('lowers impact and alignment without benefits', () => {
    let lowered = 0
    for (let n = 0; n < 50; n++) {
      const a = byCrit(full({ id: `b-${n}` }))
      const b = byCrit(full({ id: `b-${n}`, expected_benefits: '  ' }))
      expect(b.impact.score).toBeLessThanOrEqual(a.impact.score)
      expect(b.alignment.score).toBeLessThanOrEqual(a.alignment.score)
      expect(b.feasibility.score).toBe(a.feasibility.score)
      if (b.impact.score < a.impact.score) lowered++
    }
    expect(lowered).toBeGreaterThan(0)
  })

  it('lowers impact and alignment for a short description', () => {
    for (let n = 0; n < 50; n++) {
      const a = byCrit(full({ id: `d-${n}` }))
      const b = byCrit(full({ id: `d-${n}`, description: 'trop court' }))
      expect(b.impact.score).toBeLessThanOrEqual(a.impact.score)
      expect(b.alignment.score).toBeLessThanOrEqual(a.alignment.score)
      expect(b.innovation.score).toBe(a.innovation.score)
    }
  })

  it('lowers feasibility without budget only', () => {
    let lowered = 0
    for (let n = 0; n < 50; n++) {
      const a = byCrit(full({ id: `f-${n}` }))
      const b = byCrit(full({ id: `f-${n}`, budget_eur: null }))
      expect(b.feasibility.score).toBeLessThanOrEqual(a.feasibility.score)
      expect(b.impact.score).toBe(a.impact.score)
      if (b.feasibility.score < a.feasibility.score) lowered++
    }
    expect(lowered).toBeGreaterThan(0)
  })

  it('mentions theme, direction, benefits and budget in justifications', () => {
    const s = byCrit(full({ id: 'ref' }))
    expect(s.impact.justification).toContain('Qualité de vie')
    expect(s.impact.justification).toContain('Gain de temps')
    expect(s.feasibility.justification).toContain('Direction RH')
    expect(s.feasibility.justification).toContain('12')
    expect(s.alignment.justification).toContain('Direction RH')
    expect(s.alignment.justification).toContain('Qualité de vie')
  })

  it('handles an idea with no optional data', () => {
    const res = mockScore({ id: 'bare' })
    expect(schema.safeParse(res).success).toBe(true)
  })
})

describe('mockDelayMs', () => {
  it('is deterministic and within 300-800 ms', () => {
    expect(mockDelayMs('a')).toBe(mockDelayMs('a'))
    for (let n = 0; n < 100; n++) {
      const d = mockDelayMs(`x${n}`)
      expect(d).toBeGreaterThanOrEqual(MOCK_DELAY_RANGE_MS.min)
      expect(d).toBeLessThanOrEqual(MOCK_DELAY_RANGE_MS.max)
    }
  })
})
