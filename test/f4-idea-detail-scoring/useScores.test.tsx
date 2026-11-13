import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useScores } from '../../src/hooks/useScores'
import { newQueryClient } from '../helpers/render'
import { resetSupabaseMock } from '../helpers/supabase'
import { makeScore, qb, routeTables } from './helpers'

vi.mock('../../src/lib/supabase', async () => (await import('../helpers/supabase')).supabaseModuleMock())

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={newQueryClient()}>{children}</QueryClientProvider>
}

let table: ReturnType<typeof qb>

beforeEach(() => {
  resetSupabaseMock()
  table = qb({
    data: [
      makeScore('i1', 'impact', { ai_score: 4, ai_justification: 'Fort impact' }),
      makeScore('i1', 'feasibility', { ai_score: 2, final_score: 5, final_justification: 'Facile' }),
    ],
  })
  routeTables({ scores: table })
})
afterEach(() => vi.useRealTimers())

async function ready(id = 'i1') {
  const hook = renderHook(() => useScores(id), { wrapper })
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
  return hook
}

describe('useScores', () => {
  it('pre-fills final values from the AI suggestion and fills missing rows', async () => {
    const { result } = await ready()
    const [impact, feas, align] = result.current.rows
    expect(impact).toMatchObject({ final_score: 4, final_justification: 'Fort impact', ai_score: 4 })
    expect(feas).toMatchObject({ final_score: 5, final_justification: 'Facile', ai_score: 2 })
    expect(align).toMatchObject({ ai_score: null, final_score: null, final_justification: '' })
    expect(result.current.rows).toHaveLength(4)
    expect(result.current.saveState).toBe('idle')
  })

  it('debounces edits into a single upsert with only final fields', async () => {
    const { result } = await ready()
    vi.useFakeTimers()
    act(() => result.current.setFinalScore('impact', 5))
    act(() => vi.advanceTimersByTime(500))
    act(() => result.current.setFinalJustification('impact', 'Mieux'))
    expect(result.current.saveState).toBe('saving')
    expect(table.upsert).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(table.upsert).toHaveBeenCalledTimes(1)
    expect(table.upsert).toHaveBeenCalledWith(
      [{ idea_id: 'i1', criterion: 'impact', final_score: 5, final_justification: 'Mieux' }],
      { onConflict: 'idea_id,criterion' },
    )
    expect(result.current.saveState).toBe('saved')
    expect(result.current.rows[0].final_score).toBe(5)
  })

  it('reports errors', async () => {
    const { result } = await ready()
    table.upsert.mockReturnValue(qb({ error: { message: 'x' } }))
    vi.useFakeTimers()
    act(() => result.current.setFinalScore('impact', 1))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(result.current.saveState).toBe('error')
  })

  it('flushes a pending save on unmount', async () => {
    const { result, unmount } = await ready()
    act(() => result.current.setFinalScore('impact', 3))
    expect(table.upsert).not.toHaveBeenCalled()
    unmount()
    expect(table.upsert).toHaveBeenCalledTimes(1)
    expect(table.upsert.mock.calls[0][0]).toEqual([
      { idea_id: 'i1', criterion: 'impact', final_score: 3, final_justification: 'Fort impact' },
    ])
  })
})
