import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useChallenge, useIdeaFilters, useIdeas } from '../hooks/useIdeas'
import { useBulkScoring } from '../hooks/useAiScoring'
import { useRenameChallenge } from '../hooks/useChallenges'
import { useToast } from '../components/ui/useToast'
import { applyFilters, reviewProgress, sortIdeas } from '../lib/ideasList'
import { exportIdeasXlsx, ideasXlsxFilename } from '../lib/export/ideasXlsx'
import EditableTitle from '../components/challenges/EditableTitle'
import IdeaFilters from '../components/ideas/IdeaFilters'
import IdeasTable from '../components/ideas/IdeasTable'
import BulkScoringBar from '../components/ideas/BulkScoringBar'
import ProgressBar from '../components/ui/ProgressBar'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

export default function IdeasPage() {
  const { id } = useParams()
  const toast = useToast()
  const challenge = useChallenge(id)
  const ideas = useIdeas(id)
  const rename = useRenameChallenge()
  const [filters, setFilters] = useIdeaFilters()
  const bulk = useBulkScoring(id)

  const all = ideas.data
  const visible = useMemo(
    () => (all ? sortIdeas(applyFilters(all, filters), filters.sort) : []),
    [all, filters],
  )
  const progress = useMemo(() => reviewProgress(all ?? []), [all])
  const title = challenge.data?.title ?? ''

  const onRename = (t: string) =>
    rename.mutate(
      { id: id!, title: t },
      {
        onSuccess: () => challenge.refetch(),
        onError: (e) => toast.show(e.message, 'error'),
      },
    )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          {title && <EditableTitle value={title} onSave={onRename} className="text-xl" />}
          <div className="w-64 space-y-1">
            <p className="text-sm text-gray-600">
              {progress.reviewed} / {progress.total} idées évaluées
            </p>
            <ProgressBar
              value={progress.reviewed}
              max={progress.total}
              label="Idées évaluées"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={bulk.progress.running || !all || all.length === 0}
            onClick={() => bulk.start({ all: bulk.pendingCount === 0 })}
          >
            Lancer la notation IA
          </Button>
          <Link
            to={`/challenges/${id}/shortlist`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Voir la shortlist
          </Link>
          <Button
            type="button"
            disabled={visible.length === 0}
            onClick={() => exportIdeasXlsx(visible, ideasXlsxFilename(title))}
          >
            Exporter Excel
          </Button>
        </div>
      </div>

      <BulkScoringBar
        progress={bulk.progress}
        onRetry={bulk.retry}
        onRetryAll={bulk.retryAll}
        onCancel={bulk.cancel}
      />

      {ideas.isLoading && <p className="text-sm text-gray-600">Chargement…</p>}
      {ideas.isError && (
        <p role="alert" className="text-sm text-red-600">
          {ideas.error.message}
        </p>
      )}

      {all && all.length === 0 && <EmptyState title="Ce challenge ne contient aucune idée." />}

      {all && all.length > 0 && (
        <>
          <IdeaFilters items={all} filters={filters} onChange={setFilters} />
          <p className="text-sm text-gray-600" aria-live="polite">
            {visible.length} idée{visible.length > 1 ? 's' : ''} affichée
            {visible.length > 1 ? 's' : ''} sur {all.length}
          </p>
          {visible.length === 0 ? (
            <EmptyState title="Aucune idée ne correspond aux filtres" />
          ) : (
            <IdeasTable
              challengeId={id!}
              items={visible}
              allItems={all}
              sort={filters.sort}
              onSortChange={(sort) => setFilters({ ...filters, sort })}
            />
          )}
        </>
      )}
    </div>
  )
}
