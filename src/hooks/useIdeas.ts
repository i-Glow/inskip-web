import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  parseFilters,
  serializeFilters,
  type IdeaFilters,
  type IdeaListItem,
} from '../lib/ideasList'

export function useIdeas(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['ideas', challengeId],
    enabled: !!challengeId,
    queryFn: async (): Promise<IdeaListItem[]> => {
      const { data: ideas, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('challenge_id', challengeId!)
      if (error) throw new Error('Impossible de charger les idées.')
      if (!ideas || ideas.length === 0) return []

      const { data: avgs, error: avgError } = await supabase
        .from('idea_averages')
        .select('idea_id, ai_average, final_average')
        .in(
          'idea_id',
          ideas.map((i) => i.id),
        )
      if (avgError) throw new Error('Impossible de charger les moyennes.')
      const byId = new Map((avgs ?? []).map((a) => [a.idea_id, a]))
      return ideas.map((idea) => ({
        ...idea,
        aiAverage: byId.get(idea.id)?.ai_average ?? null,
        finalAverage: byId.get(idea.id)?.final_average ?? null,
      }))
    },
  })
}

export function useChallenge(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenge', challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('id, title')
        .eq('id', challengeId!)
        .single()
      if (error || !data) throw new Error('Impossible de charger le challenge.')
      return data
    },
  })
}

export function useIdeaFilters(): [IdeaFilters, (next: IdeaFilters) => void] {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])
  const setFilters = useCallback(
    (next: IdeaFilters) => setParams(serializeFilters(next), { replace: true }),
    [setParams],
  )
  return [filters, setFilters]
}
