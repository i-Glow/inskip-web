import { CRITERIA } from '../../lib/criteria'
import { finalAverage, formatAverage } from '../../lib/scoring'
import { useScores, type SaveState } from '../../hooks/useScores'
import { useValidateIdea, type Idea } from '../../hooks/useIdea'
import { useShortlist } from '../../hooks/useShortlist'
import { useToast } from '../ui/useToast'
import Button from '../ui/Button'
import CriterionScoreRow from './CriterionScoreRow'

const SAVE_LABEL: Record<SaveState, string> = {
  idle: '',
  saving: 'Enregistrement…',
  saved: 'enregistré',
  error: "Échec de l'enregistrement",
}

export default function ScoringPanel({ idea }: { idea: Idea }) {
  const toast = useToast()
  const scores = useScores(idea.id)
  const validate = useValidateIdea()
  const { toggleShortlist } = useShortlist()
  const isDuplicate = idea.status === 'duplicate' || !!idea.duplicate_of
  const average = finalAverage(scores.rows)

  const onValidate = async () => {
    await scores.flush()
    validate.mutate(idea.id, {
      onSuccess: () => toast.show('Idée validée.'),
      onError: (e) => toast.show(e.message, 'error'),
    })
  }

  const onToggle = () =>
    toggleShortlist.mutate(idea, {
      onError: (e) => toast.show(e.message, 'error'),
    })

  if (scores.isLoading) return <p className="text-sm text-gray-600">Chargement des notes…</p>
  if (scores.isError)
    return (
      <p role="alert" className="text-sm text-red-600">
        {scores.error?.message}
      </p>
    )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm">
          Moyenne : <strong>{formatAverage(average)}</strong> / 5
        </p>
        <p
          aria-live="polite"
          className={`text-xs ${scores.saveState === 'error' ? 'text-red-600' : 'text-gray-500'}`}
        >
          {SAVE_LABEL[scores.saveState]}
        </p>
      </div>

      {CRITERIA.map((c) => (
        <CriterionScoreRow
          key={c.key}
          criterion={c}
          row={scores.rows.find((r) => r.criterion === c.key)!}
          onScoreChange={(n) => scores.setFinalScore(c.key, n)}
          onJustificationChange={(t) => scores.setFinalJustification(c.key, t)}
        />
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={onValidate}
          disabled={validate.isPending || idea.status === 'reviewed'}
        >
          Valider
        </Button>
        <button
          type="button"
          onClick={onToggle}
          disabled={isDuplicate || toggleShortlist.isPending}
          aria-describedby={isDuplicate ? 'shortlist-help' : undefined}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {idea.shortlisted ? 'Retirer de la shortlist' : 'Ajouter à la shortlist'}
        </button>
      </div>
      {isDuplicate && (
        <p id="shortlist-help" className="text-xs text-gray-600">
          Une idée en doublon ne peut pas être ajoutée à la shortlist.
        </p>
      )}
    </div>
  )
}
