import ChallengeCard from '../components/challenges/ChallengeCard'
import NewChallengeUpload from '../components/challenges/NewChallengeUpload'
import EmptyState from '../components/ui/EmptyState'
import { useChallenges } from '../hooks/useChallenges'

export default function ChallengesPage() {
  const { data, isLoading, isError, error } = useChallenges()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold">Mes challenges</h1>
        <NewChallengeUpload />
      </div>
      {isLoading && <p className="text-sm text-gray-600">Chargement…</p>}
      {isError && (
        <p role="alert" className="text-sm text-red-600">
          {error.message}
        </p>
      )}
      {data && data.length === 0 && (
        <EmptyState
          title="Aucun challenge"
          text="Importez un fichier CSV ou XLSX pour créer votre premier challenge."
        />
      )}
      {data && data.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </ul>
      )}
    </div>
  )
}
