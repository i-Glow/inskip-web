import { useEffect, useRef, type ReactNode } from 'react'

interface MultiSelectDropdownProps {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  open,
  onOpenChange,
}: MultiSelectDropdownProps): ReactNode {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: Event) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onOpenChange(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v])

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm select-none"
        onClick={() => onOpenChange(!open)}
      >
        {label}
        {selected.length > 0 && ` (${selected.length})`}
      </button>
      {open && (
        <div
          role="group"
          aria-label={label}
          className="absolute z-10 mt-1 max-h-64 min-w-48 overflow-auto rounded-md border border-gray-200 bg-white p-2 shadow-lg"
        >
          {options.length === 0 && <p className="px-1 text-sm text-gray-500">Aucune valeur</p>}
          {options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 px-1 py-1 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
