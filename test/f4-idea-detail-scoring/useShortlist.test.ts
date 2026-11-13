import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addIdeasToShortlist, reorderShortlist, suggestShortlist, toggleShortlist } from '../../src/hooks/useShortlist'
import { resetSupabaseMock } from '../helpers/supabase'
import { makeRawIdea, qb, routeTables } from './helpers'

vi.mock('../../src/lib/supabase', async () => (await import('../helpers/supabase')).supabaseModuleMock())

beforeEach(() => resetSupabaseMock())

describe('toggleShortlist', () => {
  it('adds with rank max+1 within the challenge', async () => {
    const ideas = qb({ data: [{ shortlist_rank: 1 }, { shortlist_rank: 4 }] })
    routeTables({ ideas })
    const idea = makeRawIdea()
    await toggleShortlist(idea)
    expect(ideas.eq).toHaveBeenCalledWith('challenge_id', 'c1')
    expect(ideas.update).toHaveBeenCalledWith({ shortlisted: true, shortlist_rank: 5 })
  })

  it('starts at rank 1 for an empty shortlist', async () => {
    const ideas = qb({ data: [] })
    routeTables({ ideas })
    await toggleShortlist(makeRawIdea())
    expect(ideas.update).toHaveBeenCalledWith({ shortlisted: true, shortlist_rank: 1 })
  })

  it('removes and clears the rank', async () => {
    const ideas = qb()
    routeTables({ ideas })
    await toggleShortlist(makeRawIdea({ shortlisted: true, shortlist_rank: 2 }))
    expect(ideas.update).toHaveBeenCalledWith({ shortlisted: false, shortlist_rank: null })
  })

  it('refuses duplicates with a French error', async () => {
    const ideas = qb()
    routeTables({ ideas })
    await expect(toggleShortlist(makeRawIdea({ status: 'duplicate', duplicate_of: 'x' }))).rejects.toThrow(
      /doublon/,
    )
    expect(ideas.update).not.toHaveBeenCalled()
  })
})

describe('addIdeasToShortlist', () => {
  it('appends ranks after the current max, in order', async () => {
    const ideas = qb({ data: [{ shortlist_rank: 2 }, { shortlist_rank: 6 }] })
    routeTables({ ideas })
    await expect(addIdeasToShortlist('c1', ['x', 'y'])).resolves.toBe(2)
    expect(ideas.update.mock.calls.map((c) => c[0])).toEqual([
      { shortlisted: true, shortlist_rank: 7 },
      { shortlisted: true, shortlist_rank: 8 },
    ])
    expect(ideas.eq.mock.calls.filter((c) => c[0] === 'id').map((c) => c[1])).toEqual(['x', 'y'])
  })

  it('does nothing for an empty selection', async () => {
    const ideas = qb()
    routeTables({ ideas })
    await expect(addIdeasToShortlist('c1', [])).resolves.toBe(0)
    expect(ideas.update).not.toHaveBeenCalled()
  })
})

describe('reorderShortlist', () => {
  it('writes ranks 1..n', async () => {
    const ideas = qb()
    routeTables({ ideas })
    await reorderShortlist('c1', ['b', 'a', 'c'])
    expect(ideas.update.mock.calls.map((c) => c[0])).toEqual([
      { shortlist_rank: 1 },
      { shortlist_rank: 2 },
      { shortlist_rank: 3 },
    ])
    expect(ideas.eq.mock.calls.map((c) => c[1])).toEqual(['b', 'a', 'c'])
  })
})

describe('suggestShortlist', () => {
  it('picks the top N reviewed non-duplicates by final average and drops others', async () => {
    const reviewed = Array.from({ length: 10 }, (_, i) =>
      makeRawIdea({ status: 'reviewed', external_id: `R${i}` }),
    )
    const dupHigh = makeRawIdea({ status: 'duplicate', duplicate_of: reviewed[0].id })
    const aiOnly = makeRawIdea({ status: 'ai_scored' })
    const oldShort = makeRawIdea({ status: 'ai_scored', shortlisted: true, shortlist_rank: 1 })
    const ideas = qb({ data: [...reviewed, dupHigh, aiOnly, oldShort] })
    const averages = qb({
      data: [
        ...reviewed.map((r, i) => ({ idea_id: r.id, final_average: i })), // R9 best
        { idea_id: dupHigh.id, final_average: 5 },
        { idea_id: aiOnly.id, final_average: 5 },
      ],
    })
    routeTables({ ideas, idea_averages: averages })

    const picked = await suggestShortlist('c1')
    expect(picked).toEqual(reviewed.slice(2).reverse().map((r) => r.id))
    expect(picked).toHaveLength(8)
    expect(picked).not.toContain(dupHigh.id)
    expect(picked).not.toContain(aiOnly.id)
    expect(averages.in).toHaveBeenCalledWith('idea_id', reviewed.map((r) => r.id))
    expect(ideas.update).toHaveBeenCalledWith({ shortlisted: true, shortlist_rank: 1 })
    expect(ideas.update).toHaveBeenCalledWith({ shortlisted: true, shortlist_rank: 8 })
    expect(ideas.update).toHaveBeenCalledWith({ shortlisted: false, shortlist_rank: null })
    expect(ideas.in).toHaveBeenCalledWith('id', [oldShort.id])
  })

  it('honours a custom target', async () => {
    const r = [1, 2, 3].map((i) => makeRawIdea({ status: 'reviewed', external_id: `R${i}` }))
    routeTables({
      ideas: qb({ data: r }),
      idea_averages: qb({ data: r.map((x, i) => ({ idea_id: x.id, final_average: i })) }),
    })
    expect(await suggestShortlist('c1', 2)).toEqual([r[2].id, r[1].id])
  })
})
