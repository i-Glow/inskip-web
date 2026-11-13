import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BUDGET_LABEL, displayBudget, type IdeaListItem, type IdeaSort, type SortKey } from '../../lib/ideasList'
import { formatAverage } from '../../lib/scoring'
import StatusBadge from './StatusBadge'
import DuplicateBadge from './DuplicateBadge'

interface IdeasTableProps {
  challengeId: string
  /** Rows to display, already filtered and sorted. */
  items: IdeaListItem[]
  /** All ideas of the challenge (to resolve duplicate relations). */
  allItems: IdeaListItem[]
  sort: IdeaSort
  onSortChange: (sort: IdeaSort) => void
}

const COLUMNS: { key: SortKey | null; label: string; numeric?: boolean }[] = [
  { key: 'external_id', label: 'Id' },
  { key: 'title', label: 'Titre' },
  { key: 'direction', label: 'Direction' },
  { key: 'site', label: 'Site' },
  { key: 'theme', label: 'Thème' },
  { key: 'budget_eur', label: BUDGET_LABEL, numeric: true },
  { key: 'aiAverage', label: 'Moy. IA', numeric: true },
  { key: 'finalAverage', label: 'Moy. finale', numeric: true },
  { key: 'status', label: 'Statut' },
  { key: 'shortlisted', label: 'Shortlist' },
]

export default function IdeasTable({
  challengeId,
  items,
  allItems,
  sort,
  onSortChange,
}: IdeasTableProps) {
  const { search } = useLocation()
  const { byId, dupCount } = useMemo(() => {
    const byId = new Map(allItems.map((i) => [i.id, i]))
    const dupCount = new Map<string, number>()
    for (const i of allItems) {
      if (i.duplicate_of) dupCount.set(i.duplicate_of, (dupCount.get(i.duplicate_of) ?? 0) + 1)
    }
    return { byId, dupCount }
  }, [allItems])

  const clickSort = (key: SortKey) =>
    onSortChange({ key, dir: sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc' })

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[64rem] divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            {COLUMNS.map((c) => {
              const active = c.key === sort.key
              return (
                <th
                  key={c.label}
                  scope="col"
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={`px-3 py-2 font-medium ${
                    c.key === 'title' ? 'min-w-[20rem] lg:w-[38%]' : 'whitespace-nowrap'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => clickSort(c.key!)}
                    className="inline-flex items-center gap-1 hover:text-indigo-600"
                  >
                    {c.label}
                    <span aria-hidden className="text-xs text-gray-400">
                      {active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  </button>
                </th>
              )
            })}
            <th scope="col" className="px-3 py-2 font-medium">
              Doublon
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((i) => (
            <tr key={i.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap text-gray-600">{i.external_id}</td>
              <td className="min-w-[20rem] px-3 py-2 break-words whitespace-normal">
                <Link
                  to={`/challenges/${challengeId}/ideas/${i.id}${search}`}
                  className="font-medium text-indigo-700 hover:underline"
                >
                  {i.title}
                </Link>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{i.direction ?? '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap">{i.site ?? '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap">{i.theme ?? '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap">{displayBudget(i.budget_raw)}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">{formatAverage(i.aiAverage)}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">{formatAverage(i.finalAverage)}</td>
              <td className="px-3 py-2">
                <StatusBadge status={i.status} />
              </td>
              <td className="px-3 py-2">
                {i.shortlisted && (
                  <span className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    Shortlist
                  </span>
                )}
              </td>
              <td className="px-3 py-2">
                <DuplicateBadge
                  challengeId={challengeId}
                  idea={i}
                  original={i.duplicate_of ? byId.get(i.duplicate_of) : undefined}
                  duplicateCount={dupCount.get(i.id) ?? 0}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
