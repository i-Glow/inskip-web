import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import IdeasPage from '../../src/pages/IdeasPage'
import { renderWithProviders } from '../helpers/render'
import { queryBuilder, resetSupabaseMock, supabaseMock } from '../helpers/supabase'
import { makeIdea } from '../f3-ideas-list/helpers'

vi.mock('../../src/lib/supabase', async () => {
  const m = await import('../helpers/supabase')
  return { supabase: { ...m.supabaseMock, functions: { invoke: (await import('vitest')).vi.fn() } } }
})

import { supabase } from '../../src/lib/supabase'
const invoke = (supabase as unknown as { functions: { invoke: ReturnType<typeof vi.fn> } })
  .functions.invoke

const a = makeIdea({ title: 'Idée A' })
const b = makeIdea({ title: 'Idée B' })
const dup = makeIdea({ title: 'Idée copie', status: 'duplicate' })

beforeEach(() => {
  resetSupabaseMock()
  invoke.mockReset().mockResolvedValue({ data: { scores: [] }, error: null })
  supabaseMock.from.mockImplementation((t: string) => {
    if (t === 'ideas') return queryBuilder({ data: [a, b, dup] })
    if (t === 'idea_averages') return queryBuilder({ data: [] })
    return queryBuilder({ data: { id: 'c1', title: 'Mon challenge' } })
  })
})

describe('IdeasPage AI scoring', () => {
  it('starts bulk scoring from the button and shows the result', async () => {
    renderWithProviders(
      <Routes><Route path="/challenges/:id/ideas" element={<IdeasPage />} /></Routes>,
      { route: '/challenges/c1/ideas' },
    )
    await screen.findByText('Idée A')
    const btn = screen.getByRole('button', { name: 'Lancer la notation IA' })
    expect(btn).toBeEnabled()
    await userEvent.click(btn)
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/Notation IA terminée : 2 idées notées/)).toBeInTheDocument()
  })
})
