import ProgressBar from '../ui/ProgressBar'
import Button from '../ui/Button'
import type { BulkProgress } from '../../hooks/useAiScoring'

interface Props {
  progress: BulkProgress
  onRetry: (id: string) => void
  onRetryAll: () => void
  onCancel: () => void
}

export default function BulkScoringBar({ progress, onRetry, onRetryAll, onCancel }: Props) {
  const { running, done, total, failed, finished } = progress
  if (!running && !finished && failed.length === 0) return null

  return (
    <section
      aria-label="Notation IA"
      className="space-y-2 rounded-md border border-gray-200 bg-white p-4"
    >
      {running && (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-700" aria-live="polite">
              Notation IA : {done} / {total}
            </p>
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-gray-600 underline hover:text-gray-900"
            >
              Annuler
            </button>
          </div>
          <ProgressBar value={done} max={total} label="Notation IA" />
        </>
      )}
      {!running && finished && failed.length === 0 && (
        <p className="text-sm text-green-700" role="status">
          Notation IA terminée : {total} idée{total > 1 ? 's' : ''} notée{total > 1 ? 's' : ''}.
        </p>
      )}
      {!running && finished && failed.length > 0 && (
        <p className="text-sm text-gray-700" role="status">
          Notation IA terminée avec {failed.length} échec{failed.length > 1 ? 's' : ''}.
        </p>
      )}
      {failed.length > 0 && (
        <div className="space-y-1">
          <ul className="space-y-1">
            {failed.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-red-700">
                  {f.external_id} : {f.error}
                </span>
                <button
                  type="button"
                  disabled={running}
                  onClick={() => onRetry(f.id)}
                  className="text-indigo-700 underline disabled:opacity-50"
                  aria-label={`Réessayer ${f.external_id}`}
                >
                  Réessayer
                </button>
              </li>
            ))}
          </ul>
          {failed.length > 1 && (
            <Button type="button" disabled={running} onClick={onRetryAll}>
              Tout réessayer
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
