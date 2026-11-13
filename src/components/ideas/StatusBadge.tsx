import type { Tables } from '../../lib/database.types'

type Status = Tables<'ideas'>['status']

const CONFIG: Record<Status, { label: string; cls: string }> = {
  new: { label: 'Nouvelle', cls: 'bg-gray-100 text-gray-700' },
  ai_scored: { label: 'Notée IA', cls: 'bg-blue-100 text-blue-700' },
  reviewed: { label: 'Évaluée', cls: 'bg-green-100 text-green-700' },
  duplicate: { label: 'Doublon', cls: 'bg-amber-100 text-amber-700' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const c = CONFIG[status]
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${c.cls}`}>
      {c.label}
    </span>
  )
}
