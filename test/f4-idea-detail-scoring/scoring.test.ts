import { describe, expect, it } from 'vitest'
import { finalAverage, isOverridden } from '../../src/lib/scoring'
import { CRITERIA } from '../../src/lib/criteria'

describe('finalAverage', () => {
  it('uses final_score, falling back to ai_score', () => {
    expect(
      finalAverage([
        { ai_score: 2, final_score: 4 },
        { ai_score: 3, final_score: null },
      ]),
    ).toBe(3.5)
  })
  it('ignores criteria without any value and returns null when none', () => {
    expect(finalAverage([{ ai_score: null, final_score: null }, { ai_score: 5, final_score: null }])).toBe(5)
    expect(finalAverage([{ ai_score: null, final_score: null }])).toBeNull()
    expect(finalAverage([])).toBeNull()
  })
})

describe('isOverridden', () => {
  it('is true only when final is set and differs from ai', () => {
    expect(isOverridden({ ai_score: 3, final_score: 4 })).toBe(true)
    expect(isOverridden({ ai_score: 3, final_score: 3 })).toBe(false)
    expect(isOverridden({ ai_score: 3, final_score: null })).toBe(false)
    expect(isOverridden({ ai_score: null, final_score: 2 })).toBe(true)
  })
})

describe('CRITERIA', () => {
  it('lists the four criteria in order', () => {
    expect(CRITERIA.map((c) => c.key)).toEqual(['impact', 'feasibility', 'alignment', 'innovation'])
    expect(CRITERIA.map((c) => c.label)).toEqual(['Impact', 'Faisabilité', 'Alignement stratégique', 'Innovation'])
  })
})
