import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useIdeas } from '../../src/hooks/useIdeas'
import { newQueryClient } from '../helpers/render'
import { queryBuilder, resetSupabaseMock, supabaseMock } from '../helpers/supabase'
import { makeIdea } from './helpers'

vi.mock('../../src/lib/supabase', async () => (await import('../helpers/supabase')).supabaseModuleMock())

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={newQueryClient()}>{children}</QueryClientProvider>
}

beforeEach(() => resetSupabaseMock())

describe('useIdeas', () => {
  it('merges averages into ideas', async () => {
    const a = makeIdea()
    const b = makeIdea()
    const avg = queryBuilder({
      data: [{ idea_id: a.id, ai_average: 3.5, final_average: 4 }],
    })
    supabaseMock.from.mockImplementation((t: string) =>
      t === 'ideas' ? queryBuilder({ data: [a, b] }) : avg,
    )
    const { result } = renderHook(() => useIdeas('c1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(avg.in).toHaveBeenCalledWith('idea_id', [a.id, b.id])
    expect(result.current.data![0]).toMatchObject({ id: a.id, aiAverage: 3.5, finalAverage: 4 })
    expect(result.current.data![1]).toMatchObject({ id: b.id, aiAverage: null, finalAverage: null })
  })

  it('skips the averages query when there are no ideas', async () => {
    supabaseMock.from.mockImplementation(() => queryBuilder({ data: [] }))
    const { result } = renderHook(() => useIdeas('c1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
    expect(supabaseMock.from).toHaveBeenCalledTimes(1)
    expect(supabaseMock.from).toHaveBeenCalledWith('ideas')
  })

  it('exposes a French error', async () => {
    supabaseMock.from.mockReturnValue(queryBuilder({ error: { message: 'x' } }))
    const { result } = renderHook(() => useIdeas('c1'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error!.message).toMatch(/Impossible de charger/)
  })
})
