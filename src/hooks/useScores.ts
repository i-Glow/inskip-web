import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { CRITERIA, type CriterionKey } from '../lib/criteria'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export const SAVE_DEBOUNCE_MS = 800

/** One criterion as shown in the UI: AI suggestion (read-only) + editable final values. */
export interface ScoreRowView {
  criterion: CriterionKey
  ai_score: number | null
  ai_justification: string | null
  final_score: number | null
  final_justification: string
}

interface Edit {
  final_score: number | null
  final_justification: string
}

interface ServerScore {
  criterion: CriterionKey
  ai_score: number | null
  ai_justification: string | null
  final_score: number | null
  final_justification: string | null
}

const NO_EDITS: Partial<Record<CriterionKey, Edit>> = {}

export function useScores(ideaId: string | undefined) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['scores', ideaId],
    enabled: !!ideaId,
    queryFn: async (): Promise<ServerScore[]> => {
      const { data, error } = await supabase.from('scores').select('*').eq('idea_id', ideaId!)
      if (error) throw new Error('Impossible de charger les notes.')
      return data ?? []
    },
  })

  const [state, setState] = useState<{ ideaId?: string; edits: Partial<Record<CriterionKey, Edit>> }>({
    edits: {},
  })
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const editsRef = useRef<Partial<Record<CriterionKey, Edit>>>({})
  const dirty = useRef(new Set<CriterionKey>())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ideaRef = useRef(ideaId)

  // Rows with the AI suggestion as fallback for empty final values.
  const base = useMemo(() => {
    const byKey = new Map((query.data ?? []).map((s) => [s.criterion, s]))
    return CRITERIA.map((c): ScoreRowView => {
      const s = byKey.get(c.key)
      return {
        criterion: c.key,
        ai_score: s?.ai_score ?? null,
        ai_justification: s?.ai_justification ?? null,
        final_score: s?.final_score ?? s?.ai_score ?? null,
        final_justification: s?.final_justification ?? s?.ai_justification ?? '',
      }
    })
  }, [query.data])

  const edits = state.ideaId === ideaId ? state.edits : NO_EDITS
  const rows = useMemo(
    () => base.map((r) => ({ ...r, ...edits[r.criterion] })),
    [base, edits],
  )

  const save = useCallback(
    async (id: string) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
      const keys = [...dirty.current]
      if (keys.length === 0) return
      dirty.current = new Set()
      const payload = keys.map((criterion) => ({
        idea_id: id,
        criterion,
        final_score: editsRef.current[criterion]!.final_score,
        final_justification: editsRef.current[criterion]!.final_justification,
      }))
      const { error } = await supabase
        .from('scores')
        .upsert(payload, { onConflict: 'idea_id,criterion' })
      if (error) {
        keys.forEach((k) => dirty.current.add(k))
        setSaveState('error')
        return
      }
      setSaveState(dirty.current.size > 0 ? 'saving' : 'saved')
      void qc.invalidateQueries({ queryKey: ['ideas'] })
      void qc.invalidateQueries({ queryKey: ['idea', id] })
    },
    [qc],
  )

  const flush = useCallback(async () => {
    if (ideaRef.current) await save(ideaRef.current)
  }, [save])

  const update = useCallback(
    (criterion: CriterionKey, patch: Partial<Edit>) => {
      if (!ideaId || !query.data) return
      const current = editsRef.current[criterion] ?? base.find((r) => r.criterion === criterion)!
      const next: Edit = {
        final_score: current.final_score,
        final_justification: current.final_justification,
        ...patch,
      }
      editsRef.current = { ...editsRef.current, [criterion]: next }
      dirty.current.add(criterion)
      setState({ ideaId, edits: editsRef.current })
      setSaveState('saving')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void save(ideaId), SAVE_DEBOUNCE_MS)
    },
    [ideaId, query.data, base, save],
  )

  // New idea: reset local edits; flush anything pending for the previous one on cleanup.
  useEffect(() => {
    ideaRef.current = ideaId
    editsRef.current = {}
    dirty.current = new Set()
    return () => {
      if (ideaId) void save(ideaId)
    }
  }, [ideaId, save])

  return {
    rows,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    saveState,
    setFinalScore: (criterion: CriterionKey, score: number | null) =>
      update(criterion, { final_score: score }),
    setFinalJustification: (criterion: CriterionKey, text: string) =>
      update(criterion, { final_justification: text }),
    flush,
  }
}
