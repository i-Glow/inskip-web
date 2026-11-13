import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { IdeaListItem } from '../../lib/ideasList'
import { BUDGET_LABEL, displayBudget } from '../../lib/ideasList'
import { formatAverage } from '../../lib/scoring'
import StatusBadge from '../ideas/StatusBadge'

interface Props {
  challengeId: string
  items: IdeaListItem[]
  onReorder: (orderedIds: string[]) => void
  onRemove: (idea: IdeaListItem) => void
}

function Row({
  idea,
  rank,
  challengeId,
  onRemove,
}: {
  idea: IdeaListItem
  rank: number
  challengeId: string
  onRemove: (idea: IdeaListItem) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: idea.id,
  })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-md border border-gray-200 bg-white p-3 ${
        isDragging ? 'opacity-60 shadow-lg' : ''
      }`}
    >
      <button
        type="button"
        aria-label={`Déplacer ${idea.title}`}
        className="cursor-grab rounded px-2 py-1 text-gray-500 hover:bg-gray-100"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <span className="w-6 text-right font-semibold" aria-label={`Rang ${rank}`}>
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          to={`/challenges/${challengeId}/ideas/${idea.id}`}
          className="font-medium break-words whitespace-normal text-indigo-700 hover:underline"
        >
          {idea.title}
        </Link>
        <p className="text-xs text-gray-600">{idea.direction || 'Direction non renseignée'}</p>
        <p className="text-xs text-gray-600">
          {BUDGET_LABEL} : {displayBudget(idea.budget_raw)}
        </p>
      </div>
      <span className="text-sm font-semibold">{formatAverage(idea.finalAverage)}</span>
      <StatusBadge status={idea.status} />
      {idea.status !== 'reviewed' && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          Non évaluée
        </span>
      )}
      <button
        type="button"
        onClick={() => onRemove(idea)}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
      >
        Retirer
      </button>
    </li>
  )
}

export default function ShortlistList({ challengeId, items, onReorder, onRemove }: Props) {
  const [order, setOrder] = useState(items)
  const [prevItems, setPrevItems] = useState(items)
  if (prevItems !== items) {
    setPrevItems(items)
    setOrder(items)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = order.findIndex((i) => i.id === active.id)
    const to = order.findIndex((i) => i.id === over.id)
    if (from < 0 || to < 0) return
    const next = arrayMove(order, from, to)
    setOrder(next)
    onReorder(next.map((i) => i.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ol className="space-y-2">
          {order.map((idea, idx) => (
            <Row
              key={idea.id}
              idea={idea}
              rank={idx + 1}
              challengeId={challengeId}
              onRemove={onRemove}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}
