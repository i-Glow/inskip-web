import { useState } from 'react'
import Input from '../ui/Input'

interface EditableTitleProps {
  value: string
  onSave: (title: string) => void
  className?: string
}

export default function EditableTitle({ value, onSave, className = '' }: EditableTitleProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const start = () => {
    setDraft(value)
    setEditing(true)
  }
  const commit = () => {
    setEditing(false)
    const t = draft.trim()
    if (t && t !== value) onSave(t)
  }

  if (editing) {
    return (
      <Input
        autoFocus
        aria-label="Titre du challenge"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={start}
      title="Modifier le titre"
      className={`group inline-flex items-center gap-2 text-left font-semibold ${className}`}
    >
      <span>{value}</span>
      <span aria-hidden className="text-gray-400 group-hover:text-gray-700">
        ✎
      </span>
      <span className="sr-only">Modifier le titre</span>
    </button>
  )
}
