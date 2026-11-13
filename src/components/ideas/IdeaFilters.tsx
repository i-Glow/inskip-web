import { useCallback, useMemo, useState } from 'react'
import { EMPTY, EMPTY_LABEL, STATUS_OPTIONS, SORT_PRESETS, facetOptions, DEFAULT_FILTERS, DEFAULT_SORT, type IdeaFilters as Filters, type IdeaListItem } from '../../lib/ideasList'
import Input from '../ui/Input'
import MultiSelectDropdown from './MultiSelectDropdown'

interface IdeaFiltersProps {
  items: IdeaListItem[]
  filters: Filters
  onChange: (next: Filters) => void
}

export default function IdeaFilters({ items, filters, onChange }: IdeaFiltersProps) {
  const toOptions = (vals: string[]) =>
    vals.map((v) => ({ value: v, label: v === EMPTY ? EMPTY_LABEL : v }))
  const directions = useMemo(() => toOptions(facetOptions(items, 'direction')), [items])
  const sites = useMemo(() => toOptions(facetOptions(items, 'site')), [items])
  const themes = useMemo(() => toOptions(facetOptions(items, 'theme')), [items])

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const [openId, setOpenId] = useState<string | null>(null)
  const openHandler = useCallback(
    (id: string) => (open: boolean) => setOpenId((cur) => (open ? id : cur === id ? null : cur)),
    [],
  )
  const presetIndex = SORT_PRESETS.findIndex(
    (p) => p.sort.key === filters.sort.key && p.sort.dir === filters.sort.dir,
  )

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <Input
          type="search"
          aria-label="Rechercher"
          placeholder="Rechercher (titre, description)…"
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
        />
      </div>
      <MultiSelectDropdown
        open={openId === 'direction'}
        onOpenChange={openHandler('direction')}
        label="Direction"
        options={directions}
        selected={filters.directions}
        onChange={(directions) => set({ directions })}
      />
      <MultiSelectDropdown
        open={openId === 'site'}
        onOpenChange={openHandler('site')}
        label="Site"
        options={sites}
        selected={filters.sites}
        onChange={(sites) => set({ sites })}
      />
      <MultiSelectDropdown
        open={openId === 'theme'}
        onOpenChange={openHandler('theme')}
        label="Thème"
        options={themes}
        selected={filters.themes}
        onChange={(themes) => set({ themes })}
      />
      <MultiSelectDropdown
        open={openId === 'status'}
        onOpenChange={openHandler('status')}
        label="Statut"
        options={STATUS_OPTIONS}
        selected={filters.statuses}
        onChange={(statuses) => set({ statuses })}
      />
      <label className="flex items-center gap-1 text-sm">
        Trier par
        <select
          aria-label="Trier par"
          className="rounded-md border border-gray-300 bg-white px-2 py-2"
          value={presetIndex === -1 ? 'custom' : String(presetIndex)}
          onChange={(e) => {
            if (e.target.value === 'custom') return
            set({ sort: SORT_PRESETS[Number(e.target.value)].sort })
          }}
        >
          {SORT_PRESETS.map((p, i) => (
            <option key={p.label} value={String(i)}>
              {p.label}
            </option>
          ))}
          {presetIndex === -1 && <option value="custom">Personnalisé</option>}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filters.showDuplicates}
          onChange={(e) => set({ showDuplicates: e.target.checked })}
        />
        Afficher les doublons
      </label>
      <button
        type="button"
        className="text-sm text-indigo-700 hover:underline"
        onClick={() => onChange({ ...DEFAULT_FILTERS, sort: DEFAULT_SORT })}
      >
        Réinitialiser
      </button>
    </div>
  )
}
