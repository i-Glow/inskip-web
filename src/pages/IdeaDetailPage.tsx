import { Link, useLocation, useParams } from 'react-router-dom'
import { useIdea } from '../hooks/useIdea'
import { useChallenge } from '../hooks/useIdeas'
import IdeaContent from '../components/idea/IdeaContent'
import ScoringPanel from '../components/idea/ScoringPanel'
import IdeaNav from '../components/idea/IdeaNav'
import DuplicateBanner from '../components/idea/DuplicateBanner'
import EmptyState from '../components/ui/EmptyState'

export default function IdeaDetailPage() {
  const { id, ideaId } = useParams()
  const query = useIdea(ideaId)
  const challenge = useChallenge(id)
  const { search } = useLocation()

  return (
    <div className="space-y-4">
      <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1 text-sm text-gray-600">
        <Link to="/challenges" className="text-indigo-700 hover:underline">
          Mes challenges
        </Link>
        <span aria-hidden>/</span>
        <Link to={`/challenges/${id}/ideas${search}`} className="text-indigo-700 hover:underline">
          {challenge.data?.title ?? 'Challenge'}
        </Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{query.data?.idea.external_id ?? ideaId}</span>
      </nav>
      <IdeaNav challengeId={id!} ideaId={ideaId!} />
      {query.isLoading && <p className="text-sm text-gray-600">Chargement…</p>}
      {query.isError && (
        <p role="alert" className="text-sm text-red-600">
          {query.error.message}
        </p>
      )}
      {query.isSuccess && query.data === null && <EmptyState title="Idée introuvable" />}
      {query.data && (
        <>
          <DuplicateBanner challengeId={id!} detail={query.data} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] 2xl:gap-10">
            <IdeaContent idea={query.data.idea} />
            <ScoringPanel key={query.data.idea.id} idea={query.data.idea} />
          </div>
        </>
      )}
    </div>
  )
}
