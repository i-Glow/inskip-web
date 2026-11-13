import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Tables } from '../lib/database.types'

/** All score rows for the given ideas (empty list -> no query). */
export async function fetchChallengeScores(ideaIds: string[]): Promise<Tables<'scores'>[]> {
  if (ideaIds.length === 0) return []
  const { data, error } = await supabase.from('scores').select('*').in('idea_id', ideaIds)
  if (error) throw new Error('Impossible de charger les notes.')
  return data ?? []
}

export function useChallengeScores(challengeId: string | undefined, ideaIds: string[]) {
  return useQuery({
    queryKey: ['challenge-scores', challengeId, ideaIds],
    enabled: !!challengeId && ideaIds.length > 0,
    queryFn: () => fetchChallengeScores(ideaIds),
  })
}
