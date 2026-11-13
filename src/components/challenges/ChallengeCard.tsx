import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { useToast } from '../ui/useToast'
import EditableTitle from './EditableTitle'
import {
  useDeleteChallenge,
  useRenameChallenge,
  type ChallengeSummary,
} from '../../hooks/useChallenges'

const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

export default function ChallengeCard({ challenge }: { challenge: ChallengeSummary }) {
  const [confirming, setConfirming] = useState(false)
  const rename = useRenameChallenge()
  const del = useDeleteChallenge()
  const toast = useToast()

  const onDelete = () =>
    del.mutate(challenge.id, {
      onSuccess: () => setConfirming(false),
      onError: (e) => {
        setConfirming(false)
        toast.show(e.message, 'error')
      },
    })

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <EditableTitle
        value={challenge.title}
        onSave={(title) =>
          rename.mutate({ id: challenge.id, title }, { onError: (e) => toast.show(e.message, 'error') })
        }
      />
      <p className="mt-2 text-sm text-gray-700">
        {challenge.ideaCount} {challenge.ideaCount > 1 ? 'idées' : 'idée'} · {challenge.reviewedPct} %{' '}
        {challenge.reviewedPct > 1 ? 'évaluées' : 'évaluée'}
      </p>
      <p className="text-xs text-gray-500">
        Mis à jour le {dateFmt.format(new Date(challenge.updated_at ?? challenge.created_at ?? 0))}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <Link
          to={`/challenges/${challenge.id}/ideas`}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          Ouvrir
        </Link>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-sm text-red-600 hover:underline"
        >
          Supprimer
        </button>
      </div>
      {confirming && (
        <Modal title="Supprimer le challenge" onClose={() => setConfirming(false)}>
          <p className="text-sm">Supprimer ce challenge et toutes ses idées et évaluations ?</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              className="!bg-gray-200 !text-gray-900 hover:!bg-gray-300"
              onClick={() => setConfirming(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="!bg-red-600 hover:!bg-red-500"
              disabled={del.isPending}
              onClick={onDelete}
            >
              Supprimer
            </Button>
          </div>
        </Modal>
      )}
    </li>
  )
}
