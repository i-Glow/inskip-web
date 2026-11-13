import { Link } from 'react-router-dom'
import type { IdeaListItem } from '../../lib/ideasList'

interface DuplicateBadgeProps {
  challengeId: string
  idea: IdeaListItem
  /** The original idea when `idea` is a duplicate. */
  original?: IdeaListItem
  /** Number of ideas flagged as duplicates of `idea`. */
  duplicateCount?: number
}

const cls = 'inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700'

export default function DuplicateBadge({
  challengeId,
  idea,
  original,
  duplicateCount = 0,
}: DuplicateBadgeProps) {
  if (idea.status === 'duplicate' || idea.duplicate_of) {
    if (!original) return <span className={cls}>Doublon</span>
    return (
      <Link
        to={`/challenges/${challengeId}/ideas/${original.id}`}
        className={`${cls} hover:underline`}
        title={`Doublon de ${original.external_id}`}
      >
        Doublon de {original.external_id}
      </Link>
    )
  }
  if (duplicateCount > 0) {
    return (
      <span className={cls}>
        {duplicateCount} {duplicateCount > 1 ? 'doublons' : 'doublon'}
      </span>
    )
  }
  return null
}
