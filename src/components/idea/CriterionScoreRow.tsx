import type { CriterionDef } from '../../lib/criteria'
import { isOverridden } from '../../lib/scoring'
import type { ScoreRowView } from '../../hooks/useScores'

interface Props {
  criterion: CriterionDef
  row: ScoreRowView
  onScoreChange: (score: number) => void
  onJustificationChange: (text: string) => void
}

const SCORES = [1, 2, 3, 4, 5]

export default function CriterionScoreRow({
  criterion,
  row,
  onScoreChange,
  onJustificationChange,
}: Props) {
  const overridden = isOverridden(row)
  const hasAi = row.ai_score != null
  return (
    <section
      aria-label={criterion.label}
      className={`space-y-3 rounded-lg border p-4 ${overridden ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="group relative text-sm font-semibold">
          <span title={criterion.description} className="cursor-help underline decoration-dotted">
            {criterion.label}
          </span>
          <span
            role="tooltip"
            className="pointer-events-none absolute top-full left-0 z-10 mt-1 hidden w-64 rounded-md bg-gray-900 p-2 text-xs font-normal text-white group-hover:block"
          >
            {criterion.description}
          </span>
        </h3>
        {overridden && (
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">
            Modifié
          </span>
        )}
      </div>

      <div className="rounded-md bg-gray-50 p-2 text-sm">
        <p className="text-xs font-medium text-gray-500">Suggestion IA</p>
        {hasAi ? (
          <>
            <p className="font-medium">{row.ai_score} / 5</p>
            {row.ai_justification && <p className="text-gray-700">{row.ai_justification}</p>}
          </>
        ) : (
          <p className="text-gray-500">Pas encore de suggestion IA</p>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label={`Note finale – ${criterion.label}`}
        className="flex items-center gap-1"
      >
        {SCORES.map((n) => {
          const checked = row.final_score === n
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onScoreChange(n)}
              className={`h-9 w-9 rounded-md border text-sm font-medium ${
                checked
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {n}
            </button>
          )
        })}
      </div>

      <label className="block text-sm">
        <span className="text-xs font-medium text-gray-500">
          Justification finale – {criterion.label}
        </span>
        <textarea
          value={row.final_justification}
          onChange={(e) => onJustificationChange(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
        />
      </label>
    </section>
  )
}
