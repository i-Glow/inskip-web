import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useBulkScoring } from '../../src/hooks/useAiScoring'
import { newQueryClient } from '../helpers/render'
import { queryBuilder, resetSupabaseMock, supabaseMock } from '../helpers/supabase'
import { makeIdea } from '../f3-ideas-list/helpers'

vi.mock('../../src/lib/supabase', async () => {
  const m = await import('../helpers/supabase')
  return { supabase: { ...m.supabaseMock, functions: { invoke: (await import('vitest')).vi.fn() } } }
})

import { supabase } from '../../src/lib/supabase'
const invoke = (supabase as unknown as { functions: { invoke: ReturnType<typeof vi.fn> } })
  .functions.invoke

function wrapper({ children }: { children: ReactNode }) {
  const qc = newQueryClient()
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const ideas = [
  makeIdea({ external_id: 'A' }),
  makeIdea({ external_id: 'B' }),
  makeIdea({ external_id: 'C' }),
  makeIdea({ external_id: 'D' }),
  makeIdea({ external_id: 'DUP', status: 'duplicate' }),
  makeIdea({ external_id: 'E' }),
]
const scored = ideas[5]

beforeEach(() => {
  resetSupabaseMock()
  invoke.mockReset().mockResolvedValue({ data: { scores: [] }, error: null })
  supabaseMock.from.mockImplementation((t: string) =>
    t === 'ideas'
      ? queryBuilder({ data: ideas })
      : queryBuilder({ data: [{ idea_id: scored.id, ai_average: 3, final_average: 3 }] }),
  )
})

async function ready() {
  const hook = renderHook(() => useBulkScoring('c1'), { wrapper })
  await waitFor(() => expect(hook.result.current.pendingCount).toBe(4))
  return hook
}

describe('useBulkScoring', () => {
  it('scores only non-duplicate ideas without AI score', async () => {
    const { result } = await ready()
    await act(() => result.current.start())
    const ids = invoke.mock.calls.map((c) => c[1].body.idea_id).sort()
    expect(ids).toEqual(ideas.slice(0, 4).map((i) => i.id).sort())
    expect(result.current.progress).toMatchObject({ done: 4, total: 4, running: false, finished: true })
    expect(result.current.progress.failed).toEqual([])
  })

  it('can rescore all non-duplicates', async () => {
    const { result } = await ready()
    await act(() => result.current.start({ all: true }))
    expect(invoke).toHaveBeenCalledTimes(5)
    expect(invoke.mock.calls.some((c) => c[1].body.idea_id === ideas[4].id)).toBe(false)
  })

  it('never exceeds 3 concurrent calls', async () => {
    let active = 0
    let max = 0
    invoke.mockImplementation(async () => {
      active++
      max = Math.max(max, active)
      await new Promise((r) => setTimeout(r, 5))
      active--
      return { data: { scores: [] }, error: null }
    })
    const { result } = await ready()
    await act(() => result.current.start({ all: true }))
    expect(max).toBe(3)
  })

  it('collects failures with French messages and retries one', async () => {
    invoke.mockImplementation(async (_n: string, o: { body: { idea_id: string } }) =>
      o.body.idea_id === ideas[1].id
        ? { data: null, error: { context: { status: 422 } } }
        : { data: { scores: [] }, error: null },
    )
    const { result } = await ready()
    await act(() => result.current.start())
    expect(result.current.progress.failed).toEqual([
      { id: ideas[1].id, external_id: 'B', error: 'La réponse de l’IA est invalide.' },
    ])

    invoke.mockReset().mockResolvedValue({ data: { scores: [] }, error: null })
    await act(() => result.current.retry(ideas[1].id))
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(result.current.progress.failed).toEqual([])
  })

  it('keeps a failure when the retry fails again, and retryAll retries every failure', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'x' } })
    const { result } = await ready()
    await act(() => result.current.start())
    expect(result.current.progress.failed).toHaveLength(4)
    expect(result.current.progress.failed[0].error).toBe('La notation IA a échoué.')

    invoke.mockReset().mockResolvedValue({ data: { scores: [] }, error: null })
    await act(() => result.current.retryAll())
    expect(invoke).toHaveBeenCalledTimes(4)
    expect(result.current.progress.failed).toEqual([])
  })
})
