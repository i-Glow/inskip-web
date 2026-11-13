import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { runPool } from '../lib/concurrency'
import { useIdeas } from './useIdeas'

export const BULK_CONCURRENCY = 3

export interface AiScore {
  criterion: string
  score: number
  justification: string
}

function messageForStatus(status: number | undefined): string {
  switch (status) {
    case 401:
      return 'Session expirée, veuillez vous reconnecter.'
    case 404:
      return 'Idée introuvable.'
    case 409:
      return 'Cette idée est un doublon et ne peut pas être notée.'
    case 422:
      return 'La réponse de l’IA est invalide.'
    case 501:
      return 'Mode live non disponible en V1.'
    case 502:
      return 'Le fournisseur IA est indisponible.'
    default:
      return 'La notation IA a échoué.'
  }
}

export async function scoreIdea(ideaId: string): Promise<AiScore[]> {
  const { data, error } = await supabase.functions.invoke('score-idea', {
    body: { idea_id: ideaId },
  })
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status
    throw new Error(messageForStatus(status))
  }
  return (data as { scores: AiScore[] }).scores
}

export interface FailedIdea {
  id: string
  external_id: string
  error: string
}

export interface BulkProgress {
  running: boolean
  done: number
  total: number
  failed: FailedIdea[]
  finished: boolean
}

const IDLE: BulkProgress = { running: false, done: 0, total: 0, failed: [], finished: false }
const CANCELLED = 'cancelled'

interface Target {
  id: string
  external_id: string
}

export function useBulkScoring(challengeId: string | undefined) {
  const ideas = useIdeas(challengeId)
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<BulkProgress>(IDLE)
  const cancelled = useRef(false)

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['ideas', challengeId] })
  }, [queryClient, challengeId])

  /** Scores `targets`; returns the ones that failed. `base` holds failures kept from earlier runs. */
  const run = useCallback(
    async (targets: Target[], base: FailedIdea[]) => {
      cancelled.current = false
      setProgress({ running: true, done: 0, total: targets.length, failed: base, finished: false })
      const failed: FailedIdea[] = [...base]
      const results = await runPool(
        targets,
        async (t) => {
          if (cancelled.current) throw new Error(CANCELLED)
          return scoreIdea(t.id)
        },
        {
          concurrency: BULK_CONCURRENCY,
          onProgress: (done, total, r) => {
            if (!r.ok) {
              const msg = r.error instanceof Error ? r.error.message : 'La notation IA a échoué.'
              if (msg !== CANCELLED) {
                failed.push({ id: r.item.id, external_id: r.item.external_id, error: msg })
              }
            }
            setProgress({ running: true, done, total, failed: [...failed], finished: false })
          },
        },
      )
      const wasCancelled = results.some((r) => !r.ok && (r.error as Error)?.message === CANCELLED)
      setProgress((p) => ({ ...p, running: false, finished: !wasCancelled, failed: [...failed] }))
      refresh()
    },
    [refresh],
  )

  /** Default: non-duplicate ideas without AI score yet. `all`: every non-duplicate idea. */
  const start = useCallback(
    (opts: { all?: boolean } = {}) => {
      const targets = (ideas.data ?? []).filter(
        (i) => i.status !== 'duplicate' && (opts.all || i.aiAverage == null),
      )
      return run(targets, [])
    },
    [ideas.data, run],
  )

  const retryMany = useCallback(
    async (list: FailedIdea[]) => {
      const ids = new Set(list.map((f) => f.id))
      const keep = progress.failed.filter((f) => !ids.has(f.id))
      await run(
        list.map((f) => ({ id: f.id, external_id: f.external_id })),
        keep,
      )
    },
    [progress.failed, run],
  )

  const retry = useCallback(
    (id: string) => {
      const f = progress.failed.find((x) => x.id === id)
      return f ? retryMany([f]) : Promise.resolve()
    },
    [progress.failed, retryMany],
  )

  const retryAll = useCallback(() => retryMany(progress.failed), [progress.failed, retryMany])

  const cancel = useCallback(() => {
    cancelled.current = true
  }, [])

  const pendingCount = (ideas.data ?? []).filter(
    (i) => i.status !== 'duplicate' && i.aiAverage == null,
  ).length

  return { progress, start, retry, retryAll, cancel, pendingCount }
}
