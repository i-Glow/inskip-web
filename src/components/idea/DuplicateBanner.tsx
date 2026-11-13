import { Link, useLocation } from 'react-router-dom'
import { useToast } from '../ui/useToast'
import { useUnflagDuplicate, type IdeaDetail } from '../../hooks/useIdea'

export default function DuplicateBanner({ challengeId, detail }: { challengeId: string; detail: IdeaDetail }) {
  const { search } = useLocation()
  const toast = useToast()
  const unflag = useUnflagDuplicate()
  const { idea, original, duplicateCount } = detail
  const isDuplicate = idea.status === 'duplicate' || !!idea.duplicate_of

  if (isDuplicate) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <p>
          {original ? (
            <>
              Doublon de{' '}
              <Link
                to={`/challenges/${challengeId}/ideas/${original.id}${search}`}
                className="font-medium underline"
              >
                {original.external_id}
              </Link>
            </>
          ) : (
            'Doublon'
          )}
        </p>
        <button
          type="button"
          disabled={unflag.isPending}
          onClick={() =>
            unflag.mutate(idea.id, {
              onSuccess: () => toast.show('Le doublon a été retiré.'),
              onError: (e) => toast.show(e.message, 'error'),
            })
          }
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 font-medium hover:bg-amber-100 disabled:opacity-50"
        >
          Ce n'est pas un doublon
        </button>
      </div>
    )
  }
  if (duplicateCount > 0) {
    return (
      <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
        {duplicateCount} {duplicateCount > 1 ? 'doublons' : 'doublon'}
      </p>
    )
  }
  return null
}
