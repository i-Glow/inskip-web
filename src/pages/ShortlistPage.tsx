import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useChallenge, useIdeas } from '../hooks/useIdeas'
import { DEFAULT_SHORTLIST_TARGET, useShortlist } from '../hooks/useShortlist'
import { useToast } from '../components/ui/useToast'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import AddIdeasModal from '../components/shortlist/AddIdeasModal'
import ShortlistList from '../components/shortlist/ShortlistList'
import ExportButtons from '../components/shortlist/ExportButtons'

export default function ShortlistPage() {
  const { id } = useParams()
  const toast = useToast()
  const challenge = useChallenge(id)
  const ideas = useIdeas(id)
  const { toggleShortlist, reorder, suggest, addIdeas } = useShortlist()
  const [confirming, setConfirming] = useState(false)
  const [adding, setAdding] = useState(false)

  const all = ideas.data
  const shortlisted = useMemo(
    () =>
      (all ?? [])
        .filter((i) => i.shortlisted)
        .sort((a, b) => (a.shortlist_rank ?? Infinity) - (b.shortlist_rank ?? Infinity)),
    [all],
  )
  const unreviewed = shortlisted.filter((i) => i.status !== 'reviewed').length
  const onTarget = shortlisted.length === DEFAULT_SHORTLIST_TARGET
  const title = challenge.data?.title ?? ''

  const runSuggest = () => {
    setConfirming(false)
    suggest.mutate(
      { challengeId: id!, target: DEFAULT_SHORTLIST_TARGET },
      {
        onSuccess: () => toast.show('Shortlist proposée.', 'success'),
        onError: (e) => toast.show(e.message, 'error'),
      },
    )
  }

  const onAdd = (orderedIds: string[]) =>
    addIdeas.mutate(
      { challengeId: id!, orderedIds },
      {
        onSuccess: () => {
          setAdding(false)
          toast.show(`${orderedIds.length} idée(s) ajoutée(s) à la shortlist`, 'success')
        },
        onError: (e) => toast.show(e.message, 'error'),
      },
    )

  const onReorder = (orderedIds: string[]) =>
    reorder.mutate({ challengeId: id!, orderedIds }, { onError: (e) => toast.show(e.message, 'error') })

  const onRemove = (idea: (typeof shortlisted)[number]) =>
    toggleShortlist.mutate(idea, { onError: (e) => toast.show(e.message, 'error') })

  return (
    <div className="space-y-4 md:flex md:min-h-0 md:flex-1 md:flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Link to="/challenges" className="block text-sm text-indigo-700 hover:underline">
            ← Mes challenges
          </Link>
          <Link to={`/challenges/${id}/ideas`} className="text-sm text-indigo-700 hover:underline">
            Retour aux idées
          </Link>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p
            data-testid="shortlist-counter"
            className={`text-sm font-medium ${onTarget ? 'text-green-700' : 'text-amber-700'}`}
          >
            {shortlisted.length} / {DEFAULT_SHORTLIST_TARGET}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={suggest.isPending || !all}
            onClick={() => (shortlisted.length > 0 ? setConfirming(true) : runSuggest())}
          >
            Suggérer
          </Button>
          <Button type="button" disabled={!all} onClick={() => setAdding(true)}>
            Ajouter des idées
          </Button>
          <ExportButtons challengeTitle={title} ideas={all ?? []} />
        </div>
      </div>

      {unreviewed > 0 && (
        <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {unreviewed} idée{unreviewed > 1 ? 's' : ''} de la shortlist ne sont pas encore évaluées
        </div>
      )}

      {ideas.isLoading && <p className="text-sm text-gray-600">Chargement…</p>}
      {ideas.isError && (
        <p role="alert" className="text-sm text-red-600">
          {ideas.error.message}
        </p>
      )}

      {all &&
        (shortlisted.length === 0 ? (
          <EmptyState
            title="Aucune idée dans la shortlist"
            text="Utilisez « Suggérer » ou ajoutez des idées depuis leur fiche."
          />
        ) : (
          <div className="min-h-[24rem] md:min-h-0 md:flex-1 md:overflow-auto">
            <ShortlistList
              challengeId={id!}
              items={shortlisted}
              onReorder={onReorder}
              onRemove={onRemove}
            />
          </div>
        ))}

      {adding && all && (
        <AddIdeasModal
          ideas={all}
          pending={addIdeas.isPending}
          onClose={() => setAdding(false)}
          onAdd={onAdd}
        />
      )}

      {confirming && (
        <Modal title="Remplacer la shortlist ?" onClose={() => setConfirming(false)}>
          <p className="text-sm text-gray-700">
            La shortlist actuelle sera remplacée par les {DEFAULT_SHORTLIST_TARGET} meilleures idées évaluées.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => setConfirming(false)}
            >
              Annuler
            </button>
            <Button type="button" onClick={runSuggest}>
              Remplacer
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
