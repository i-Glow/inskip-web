import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Tables } from '../lib/database.types'

export type Idea = Tables<'ideas'>

export interface IdeaDetail {
  idea: Idea
  /** The original idea when `idea` is a duplicate. */
  original: { id: string; external_id: string } | null
  /** Number of ideas flagged as duplicates of `idea`. */
  duplicateCount: number
}

/** Resolves to null when the idea does not exist. */
export function useIdea(ideaId: string | undefined) {
  return useQuery({
    queryKey: ['idea', ideaId],
    enabled: !!ideaId,
    queryFn: async (): Promise<IdeaDetail | null> => {
      const { data: idea, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', ideaId!)
        .maybeSingle()
      if (error) throw new Error("Impossible de charger l'idée.")
      if (!idea) return null

      let original: IdeaDetail['original'] = null
      if (idea.duplicate_of) {
        const { data } = await supabase
          .from('ideas')
          .select('id, external_id')
          .eq('id', idea.duplicate_of)
          .maybeSingle()
        original = data ?? null
      }

      const { data: dups, error: dupError } = await supabase
        .from('ideas')
        .select('id')
        .eq('duplicate_of', idea.id)
      if (dupError) throw new Error("Impossible de charger l'idée.")

      return { idea, original, duplicateCount: dups?.length ?? 0 }
    },
  })
}

function useInvalidateIdea() {
  const qc = useQueryClient()
  return (ideaId: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['idea', ideaId] }),
      qc.invalidateQueries({ queryKey: ['ideas'] }),
    ])
}

/** Marks an idea as reviewed ("Valider"). */
export function useValidateIdea() {
  const invalidate = useInvalidateIdea()
  return useMutation({
    mutationFn: async (ideaId: string) => {
      const { error } = await supabase.from('ideas').update({ status: 'reviewed' }).eq('id', ideaId)
      if (error) throw new Error("Impossible de valider l'idée.")
    },
    onSuccess: (_d, ideaId) => invalidate(ideaId),
  })
}

/** "Ce n'est pas un doublon": clears duplicate_of; status goes back to ai_scored or new. */
export function useUnflagDuplicate() {
  const invalidate = useInvalidateIdea()
  return useMutation({
    mutationFn: async (ideaId: string) => {
      const { data, error: scoresError } = await supabase
        .from('scores')
        .select('ai_score')
        .eq('idea_id', ideaId)
      if (scoresError) throw new Error('Impossible de retirer le statut de doublon.')
      const hasAi = (data ?? []).some((s) => s.ai_score != null)
      const { error } = await supabase
        .from('ideas')
        .update({ duplicate_of: null, status: hasAi ? 'ai_scored' : 'new' })
        .eq('id', ideaId)
      if (error) throw new Error('Impossible de retirer le statut de doublon.')
    },
    onSuccess: (_d, ideaId) => invalidate(ideaId),
  })
}
