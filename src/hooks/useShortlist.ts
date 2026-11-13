import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Tables } from '../lib/database.types'

export const DEFAULT_SHORTLIST_TARGET = 8

type ShortlistableIdea = Pick<
  Tables<'ideas'>,
  'id' | 'challenge_id' | 'status' | 'duplicate_of' | 'shortlisted'
>

/** Adds the idea at the end of the shortlist, or removes it. Duplicates are refused. */
export async function toggleShortlist(idea: ShortlistableIdea): Promise<{ shortlisted: boolean }> {
  if (idea.shortlisted) {
    const { error } = await supabase
      .from('ideas')
      .update({ shortlisted: false, shortlist_rank: null })
      .eq('id', idea.id)
    if (error) throw new Error('Impossible de retirer l\'idée de la shortlist.')
    return { shortlisted: false }
  }
  if (idea.status === 'duplicate' || idea.duplicate_of) {
    throw new Error('Une idée en doublon ne peut pas être ajoutée à la shortlist.')
  }
  const { data, error: rankError } = await supabase
    .from('ideas')
    .select('shortlist_rank')
    .eq('challenge_id', idea.challenge_id)
    .eq('shortlisted', true)
  if (rankError) throw new Error('Impossible de modifier la shortlist.')
  const max = Math.max(0, ...(data ?? []).map((r) => r.shortlist_rank ?? 0))
  const { error } = await supabase
    .from('ideas')
    .update({ shortlisted: true, shortlist_rank: max + 1 })
    .eq('id', idea.id)
  if (error) throw new Error('Impossible de modifier la shortlist.')
  return { shortlisted: true }
}

/** Appends the ideas to the end of the shortlist, in the given order. */
export async function addIdeasToShortlist(challengeId: string, orderedIds: string[]): Promise<number> {
  if (orderedIds.length === 0) return 0
  const { data, error: rankError } = await supabase
    .from('ideas')
    .select('shortlist_rank')
    .eq('challenge_id', challengeId)
    .eq('shortlisted', true)
  if (rankError) throw new Error('Impossible de modifier la shortlist.')
  const max = Math.max(0, ...(data ?? []).map((r) => r.shortlist_rank ?? 0))
  const results = await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from('ideas').update({ shortlisted: true, shortlist_rank: max + i + 1 }).eq('id', id),
    ),
  )
  if (results.some((r) => r.error)) throw new Error('Impossible de modifier la shortlist.')
  return orderedIds.length
}

/** Writes ranks 1..n following `orderedIds`. */
export async function reorderShortlist(_challengeId: string, orderedIds: string[]): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, i) => supabase.from('ideas').update({ shortlist_rank: i + 1 }).eq('id', id)),
  )
  if (results.some((r) => r.error)) throw new Error('Impossible de réordonner la shortlist.')
}

/**
 * Shortlists the top `target` reviewed, non-duplicate ideas by final average and
 * unshortlists the others. Returns the ids picked, in rank order.
 */
export async function suggestShortlist(
  challengeId: string,
  target: number = DEFAULT_SHORTLIST_TARGET,
): Promise<string[]> {
  const { data: ideas, error } = await supabase
    .from('ideas')
    .select('id, external_id, status, duplicate_of, shortlisted')
    .eq('challenge_id', challengeId)
  if (error) throw new Error('Impossible de proposer une shortlist.')
  const all = ideas ?? []
  const candidates = all.filter((i) => i.status === 'reviewed' && !i.duplicate_of)

  const averages = new Map<string, number>()
  if (candidates.length > 0) {
    const { data: avgs, error: avgError } = await supabase
      .from('idea_averages')
      .select('idea_id, final_average')
      .in(
        'idea_id',
        candidates.map((i) => i.id),
      )
    if (avgError) throw new Error('Impossible de proposer une shortlist.')
    for (const a of avgs ?? []) if (a.idea_id && a.final_average != null) averages.set(a.idea_id, a.final_average)
  }

  const picked = candidates
    .filter((i) => averages.has(i.id))
    .sort(
      (a, b) =>
        averages.get(b.id)! - averages.get(a.id)! ||
        a.external_id.localeCompare(b.external_id, 'fr', { numeric: true }),
    )
    .slice(0, target)
  const pickedIds = new Set(picked.map((i) => i.id))

  const results = await Promise.all(
    picked.map((i, idx) =>
      supabase.from('ideas').update({ shortlisted: true, shortlist_rank: idx + 1 }).eq('id', i.id),
    ),
  )
  const dropIds = all.filter((i) => i.shortlisted && !pickedIds.has(i.id)).map((i) => i.id)
  if (dropIds.length > 0) {
    results.push(
      await supabase
        .from('ideas')
        .update({ shortlisted: false, shortlist_rank: null })
        .in('id', dropIds),
    )
  }
  if (results.some((r) => r.error)) throw new Error('Impossible de proposer une shortlist.')
  return picked.map((i) => i.id)
}

export function useShortlist() {
  const qc = useQueryClient()
  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['ideas'] }),
      qc.invalidateQueries({ queryKey: ['idea'] }),
    ])
  return {
    toggleShortlist: useMutation({ mutationFn: toggleShortlist, onSuccess: invalidate }),
    addIdeas: useMutation({
      mutationFn: (v: { challengeId: string; orderedIds: string[] }) =>
        addIdeasToShortlist(v.challengeId, v.orderedIds),
      onSuccess: invalidate,
    }),
    reorder: useMutation({
      mutationFn: (v: { challengeId: string; orderedIds: string[] }) =>
        reorderShortlist(v.challengeId, v.orderedIds),
      onSuccess: invalidate,
    }),
    suggest: useMutation({
      mutationFn: (v: { challengeId: string; target?: number }) =>
        suggestShortlist(v.challengeId, v.target),
      onSuccess: invalidate,
    }),
  }
}
