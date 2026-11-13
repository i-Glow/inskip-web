import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useIdeas } from '../../hooks/useIdeas'
import { applyFilters, parseFilters, sortIdeas } from '../../lib/ideasList'

interface Props {
  challengeId: string
  ideaId: string
}

const linkCls = 'rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50'
const disabledCls = 'rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-400'

/** Previous / next idea within the list as filtered and sorted by the URL query string. */
export default function IdeaNav({ challengeId, ideaId }: Props) {
  const { search } = useLocation()
  const ideas = useIdeas(challengeId)

  const { index, list } = useMemo(() => {
    const filters = parseFilters(new URLSearchParams(search))
    const list = sortIdeas(applyFilters(ideas.data ?? [], filters), filters.sort)
    return { list, index: list.findIndex((i) => i.id === ideaId) }
  }, [ideas.data, search, ideaId])

  const prev = index > 0 ? list[index - 1] : undefined
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : undefined
  const to = (id: string) => `/challenges/${challengeId}/ideas/${id}${search}`

  return (
    <nav aria-label="Navigation entre les idées" className="flex flex-wrap items-center gap-2">
      <Link to={`/challenges/${challengeId}/ideas${search}`} className="text-sm text-indigo-700 hover:underline">
        Retour à la liste
      </Link>
      <span className="flex-1" />
      {index >= 0 && (
        <span className="text-sm text-gray-600">
          {index + 1} / {list.length}
        </span>
      )}
      {prev ? (
        <Link to={to(prev.id)} className={linkCls}>
          Précédente
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledCls}>
          Précédente
        </span>
      )}
      {next ? (
        <Link to={to(next.id)} className={linkCls}>
          Suivante
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledCls}>
          Suivante
        </span>
      )}
    </nav>
  )
}
