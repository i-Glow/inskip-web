import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { parseFile } from '../lib/import/parseFile'

export interface ChallengeSummary {
  id: string
  title: string
  source_filename: string | null
  created_at: string | null
  updated_at: string | null
  ideaCount: number
  reviewedPct: number
}

const KEY = ['challenges']

export function useChallenges() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<ChallengeSummary[]> => {
      const { data, error } = await supabase
        .from('challenges')
        .select('id, title, source_filename, created_at, updated_at, ideas(status)')
        .order('updated_at', { ascending: false })
      if (error) throw new Error('Impossible de charger les challenges.')
      return (data ?? []).map(({ ideas, ...c }) => {
        const real = (ideas ?? []).filter((i) => i.status !== 'duplicate')
        const reviewed = real.filter((i) => i.status === 'reviewed').length
        return {
          ...c,
          ideaCount: real.length,
          reviewedPct: real.length ? Math.round((100 * reviewed) / real.length) : 0,
        }
      })
    },
  })
}

export function useCreateChallengeFromFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const parsed = await parseFile(file)
      if (!parsed.ok) throw new Error(parsed.error)

      const title = file.name.replace(/\.[^.]+$/, '')
      const { data: challenge, error } = await supabase
        .from('challenges')
        .insert({ title, source_filename: file.name })
        .select('id')
        .single()
      if (error || !challenge) throw new Error('Impossible de créer le challenge.')

      const challengeId = challenge.id
      const { error: ideasError } = await supabase
        .from('ideas')
        .insert(parsed.rows.map((r) => ({ ...r, challenge_id: challengeId })))
      if (ideasError) {
        await supabase.from('challenges').delete().eq('id', challengeId)
        throw new Error("Échec de l'import des idées. Aucun challenge n'a été créé.")
      }

      const { data: dup } = await supabase.rpc('flag_exact_duplicates', {
        p_challenge_id: challengeId,
      })
      return {
        challengeId,
        imported: parsed.rows.length,
        skipped: parsed.skipped,
        duplicates: dup ?? 0,
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRenameChallenge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const t = title.trim()
      if (!t) throw new Error('Le titre ne peut pas être vide.')
      const { error } = await supabase.from('challenges').update({ title: t }).eq('id', id)
      if (error) throw new Error('Impossible de renommer le challenge.')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteChallenge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('challenges').delete().eq('id', id)
      if (error) throw new Error('Impossible de supprimer le challenge.')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
