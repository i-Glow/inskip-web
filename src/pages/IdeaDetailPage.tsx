import { useParams } from 'react-router-dom'
import { useIdea } from '../hooks/useIdea'
import IdeaContent from '../components/idea/IdeaContent'
import ScoringPanel from '../components/idea/ScoringPanel'
import IdeaNav from '../components/idea/IdeaNav'
import DuplicateBanner from '../components/idea/DuplicateBanner'
import EmptyState from '../components/ui/EmptyState'

export default function IdeaDetailPage() {
  const { id, ideaId } = useParams()
  const query = useIdea(ideaId)

  return (
    <div className="space-y-4">
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
          <div className="grid gap-6 lg:grid-cols-2">
            <IdeaContent idea={query.data.idea} />
            <ScoringPanel key={query.data.idea.id} idea={query.data.idea} />
          </div>
        </>
      )}
    </div>
  )
}
