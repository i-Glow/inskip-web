import { useMemo, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { addCandidates, normalizeText, type IdeaListItem } from '../../lib/ideasList'
import { formatAverage } from '../../lib/scoring'

interface Props {
  /** All ideas of the challenge. */
  ideas: IdeaListItem[]
  pending?: boolean
  onClose: () => void
  /** Ids of the selected ideas, in display order (final average desc). */
  onAdd: (orderedIds: string[]) => void
}

export default function AddIdeasModal({ ideas, pending, onClose, onAdd }: Props) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const candidates = useMemo(() => addCandidates(ideas), [ideas])
  const visible = useMemo(() => {
    const n = normalizeText(q.trim())
    return n
      ? candidates.filter((i) => normalizeText(`${i.external_id} ${i.title}`).includes(n))
      : candidates
  }, [candidates, q])

  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const add = () => onAdd(candidates.filter((i) => selected.has(i.id)).map((i) => i.id))

  return (
    <Modal title="Ajouter des idées" onClose={onClose} wide>
      <Input
        type="search"
        aria-label="Rechercher une idée"
        placeholder="Rechercher (identifiant, titre)…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="mt-3 max-h-96 overflow-auto rounded-md border border-gray-200">
        {visible.length === 0 ? (
          <p className="p-3 text-sm text-gray-600">Aucune idée disponible.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th scope="col" className="w-8 px-3 py-2" />
                <th scope="col" className="px-3 py-2 font-medium whitespace-nowrap">Id</th>
                <th scope="col" className="min-w-[16rem] px-3 py-2 font-medium lg:w-[55%]">Titre</th>
                <th scope="col" className="px-3 py-2 font-medium whitespace-nowrap">Moy. finale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((i) => (
                <tr key={i.id}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Sélectionner ${i.external_id}`}
                      checked={selected.has(i.id)}
                      onChange={() => toggle(i.id)}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">{i.external_id}</td>
                  <td className="px-3 py-2 break-words whitespace-normal">
                    {i.title}
                    {i.status !== 'reviewed' && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Non évaluée
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatAverage(i.finalAverage)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          onClick={onClose}
        >
          Annuler
        </button>
        <Button type="button" disabled={selected.size === 0 || pending} onClick={add}>
          Ajouter ({selected.size})
        </Button>
      </div>
    </Modal>
  )
}
