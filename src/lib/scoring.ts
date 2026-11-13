const fmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function roundAverage(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null
  return Math.round(value * 10) / 10
}

/** 3.456 -> "3,5"; null -> "—". */
export function formatAverage(value: number | null | undefined): string {
  const r = roundAverage(value)
  return r == null ? '—' : fmt.format(r)
}

export interface ScoreValues {
  ai_score: number | null
  final_score: number | null
}

/** Score retained for a criterion: the reviewer's final score, else the AI suggestion. */
export function effectiveScore(score: ScoreValues): number | null {
  return score.final_score ?? score.ai_score
}

/** Mean of `final_score ?? ai_score` over the criteria that have a value; null if none. */
export function finalAverage(scores: ScoreValues[]): number | null {
  const values = scores.map(effectiveScore).filter((v): v is number => v != null)
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** True when a final score is set and differs from the AI suggestion. */
export function isOverridden(score: ScoreValues): boolean {
  return score.final_score != null && score.final_score !== score.ai_score
}
