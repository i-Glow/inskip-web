import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  text?: string
  action?: ReactNode
}

export default function EmptyState({ title, text, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      {text && <p className="mt-1 text-sm text-gray-600">{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
