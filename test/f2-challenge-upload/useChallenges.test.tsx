import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useChallenges,
  useCreateChallengeFromFile,
  useDeleteChallenge,
  useRenameChallenge,
} from '../../src/hooks/useChallenges'
import { newQueryClient } from '../helpers/render'
import { readFixture } from '../helpers/fixtures'
import { queryBuilder, resetSupabaseMock, supabaseMock } from '../helpers/supabase'

vi.mock('../../src/lib/supabase', async () => (await import('../helpers/supabase')).supabaseModuleMock())

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={newQueryClient()}>{children}</QueryClientProvider>
}

beforeEach(() => {
  resetSupabaseMock()
})

const csvFile = (name = 'idees_hexavia.csv') =>
  new File([readFixture('idees_hexavia.csv')], name, { type: 'text/csv' })

describe('useChallenges (list)', () => {
  it('computes ideaCount (excluding duplicates) and reviewedPct', async () => {
    const row = (id: string, statuses: string[]) => ({
      id,
      title: id,
      source_filename: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
      ideas: statuses.map((status) => ({ status })),
    })
    const builder = queryBuilder({
      data: [
        row('a', ['new', 'reviewed', 'reviewed', 'duplicate', 'duplicate']),
        row('b', []),
        row('c', ['reviewed', 'new', 'new']),
      ],
    })
    supabaseMock.from.mockReturnValue(builder)

    const { result } = renderHook(() => useChallenges(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabaseMock.from).toHaveBeenCalledWith('challenges')
    const [a, b, c] = result.current.data!
    expect([a.ideaCount, a.reviewedPct]).toEqual([3, 67])
    expect([b.ideaCount, b.reviewedPct]).toEqual([0, 0])
    expect([c.ideaCount, c.reviewedPct]).toEqual([3, 33])
    expect('ideas' in a).toBe(false)
  })

  it('exposes a French error when loading fails', async () => {
    supabaseMock.from.mockReturnValue(queryBuilder({ error: { message: 'x' } }))
    const { result } = renderHook(() => useChallenges(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Impossible de charger les challenges.')
  })
})

describe('useCreateChallengeFromFile', () => {
  function setup(opts: { ideasError?: unknown; challengeError?: unknown } = {}) {
    const challenges = queryBuilder({
      data: opts.challengeError ? null : { id: 'ch-1' },
      error: opts.challengeError ?? null,
    })
    const ideas = queryBuilder({ error: opts.ideasError ?? null })
    supabaseMock.from.mockImplementation((t: string) => (t === 'ideas' ? ideas : challenges))
    return { challenges, ideas }
  }

  it('imports the fixture: parse, insert challenge, insert ideas, flag duplicates', async () => {
    const { challenges, ideas } = setup()
    supabaseMock.rpc.mockResolvedValue({ data: 1, error: null })
    const { result } = renderHook(() => useCreateChallengeFromFile(), { wrapper })

    const out = await result.current.mutateAsync(csvFile())

    expect(out).toEqual({ challengeId: 'ch-1', imported: 40, skipped: 0, duplicates: 1 })
    expect(challenges.insert).toHaveBeenCalledWith({
      title: 'idees_hexavia',
      source_filename: 'idees_hexavia.csv',
    })
    const rows = ideas.insert.mock.calls[0][0] as { challenge_id: string }[]
    expect(rows).toHaveLength(40)
    expect(rows.every((r) => r.challenge_id === 'ch-1')).toBe(true)
    expect(supabaseMock.rpc).toHaveBeenCalledWith('flag_exact_duplicates', { p_challenge_id: 'ch-1' })
  })

  it('uses the filename without its extension as title', async () => {
    const { challenges } = setup()
    const { result } = renderHook(() => useCreateChallengeFromFile(), { wrapper })
    await result.current.mutateAsync(csvFile('Mon.challenge.v2.csv'))
    expect(challenges.insert.mock.calls[0][0].title).toBe('Mon.challenge.v2')
  })

  it('reports 0 duplicates when rpc returns null', async () => {
    setup()
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null })
    const { result } = renderHook(() => useCreateChallengeFromFile(), { wrapper })
    const out = await result.current.mutateAsync(csvFile())
    expect(out.duplicates).toBe(0)
  })

  it('does not insert anything on a parse error', async () => {
    setup()
    const { result } = renderHook(() => useCreateChallengeFromFile(), { wrapper })
    const bad = new File(['id;prenom\nA;Jo\n'], 'bad.csv', { type: 'text/csv' })
    await expect(result.current.mutateAsync(bad)).rejects.toThrow(
      'Colonnes obligatoires manquantes : titre, description',
    )
    expect(supabaseMock.from).not.toHaveBeenCalled()
    expect(supabaseMock.rpc).not.toHaveBeenCalled()
  })

  it('rejects unsupported formats without inserting', async () => {
    setup()
    const { result } = renderHook(() => useCreateChallengeFromFile(), { wrapper })
    await expect(result.current.mutateAsync(new File(['x'], 'a.txt'))).rejects.toThrow(
      'Format non supporté',
    )
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  it('fails in French when the challenge insert fails', async () => {
    const { ideas } = setup({ challengeError: { message: 'x' } })
    const { result } = renderHook(() => useCreateChallengeFromFile(), { wrapper })
    await expect(result.current.mutateAsync(csvFile())).rejects.toThrow(
      'Impossible de créer le challenge.',
    )
    expect(ideas.insert).not.toHaveBeenCalled()
  })

  it('rolls back the challenge when the ideas insert fails', async () => {
    const { challenges, ideas } = setup({ ideasError: { message: 'x' } })
    const { result } = renderHook(() => useCreateChallengeFromFile(), { wrapper })
    await expect(result.current.mutateAsync(csvFile())).rejects.toThrow(
      "Échec de l'import des idées. Aucun challenge n'a été créé.",
    )
    expect(ideas.insert).toHaveBeenCalledOnce()
    expect(challenges.delete).toHaveBeenCalledOnce()
    expect(challenges.eq).toHaveBeenCalledWith('id', 'ch-1')
    expect(supabaseMock.rpc).not.toHaveBeenCalled()
  })
})

describe('useRenameChallenge / useDeleteChallenge', () => {
  it('renames with a trimmed title', async () => {
    const b = queryBuilder()
    supabaseMock.from.mockReturnValue(b)
    const { result } = renderHook(() => useRenameChallenge(), { wrapper })
    await result.current.mutateAsync({ id: 'c1', title: '  Nouveau  ' })
    expect(b.update).toHaveBeenCalledWith({ title: 'Nouveau' })
    expect(b.eq).toHaveBeenCalledWith('id', 'c1')
  })

  it('rejects an empty title without calling supabase', async () => {
    const { result } = renderHook(() => useRenameChallenge(), { wrapper })
    await expect(result.current.mutateAsync({ id: 'c1', title: '   ' })).rejects.toThrow(
      'Le titre ne peut pas être vide.',
    )
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  it('deletes by id and surfaces a French error on failure', async () => {
    const ok = queryBuilder()
    supabaseMock.from.mockReturnValue(ok)
    const { result } = renderHook(() => useDeleteChallenge(), { wrapper })
    await result.current.mutateAsync('c1')
    expect(ok.eq).toHaveBeenCalledWith('id', 'c1')

    supabaseMock.from.mockReturnValue(queryBuilder({ error: { message: 'x' } }))
    await expect(result.current.mutateAsync('c1')).rejects.toThrow(
      'Impossible de supprimer le challenge.',
    )
  })
})
