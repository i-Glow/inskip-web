import * as XLSX from 'xlsx'
import type { IdeaListItem } from '../ideasList'
import { CRITERIA } from '../criteria'
import { effectiveScore, finalAverage, roundAverage } from '../scoring'

export const IDEAS_XLSX_HEADERS = [
  'Id',
  'Titre',
  'Direction',
  'Site',
  'Thème',
  'Budget estimé (texte)',
  'Budget estimé (€)',
  'Moyenne IA',
  'Moyenne finale',
  'Statut',
  'Doublon de',
  'Shortlist',
] as const

const STATUS_LABELS: Record<string, string> = {
  new: 'Nouvelle',
  ai_scored: 'Notée IA',
  reviewed: 'Évaluée',
  duplicate: 'Doublon',
}

export function buildIdeasWorkbook(items: IdeaListItem[]): XLSX.WorkBook {
  const byId = new Map(items.map((i) => [i.id, i]))
  const rows = items.map((i) => [
    i.external_id,
    i.title,
    i.direction ?? '',
    i.site ?? '',
    i.theme ?? '',
    i.budget_raw ?? '',
    i.budget_eur ?? '',
    roundAverage(i.aiAverage) ?? '',
    roundAverage(i.finalAverage) ?? '',
    STATUS_LABELS[i.status] ?? i.status,
    i.duplicate_of ? (byId.get(i.duplicate_of)?.external_id ?? '') : '',
    i.shortlisted ? 'Oui' : 'Non',
  ])
  const ws = XLSX.utils.aoa_to_sheet([[...IDEAS_XLSX_HEADERS], ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Idées')
  return wb
}

export function ideasXlsxFilename(challengeTitle: string): string {
  const safe = challengeTitle.replace(/[\\/:*?"<>|]/g, '_').trim() || 'challenge'
  return `${safe}_idees.xlsx`
}

export function exportIdeasXlsx(items: IdeaListItem[], filename: string): void {
  XLSX.writeFile(buildIdeasWorkbook(items), filename)
}

/* ---------- F7: full challenge evaluation workbook ---------- */

type RawScore = { idea_id: string; criterion: string; ai_score: number | null; final_score: number | null }

export const CHALLENGE_XLSX_HEADERS = [
  'Id',
  'Titre',
  'Direction',
  'Site',
  'Thème',
  'Budget estimé (texte)',
  'Budget estimé (€)',
  ...CRITERIA.map((c) => c.label),
  'Moyenne',
  'Statut',
  'Rang shortlist',
] as const

/** Non-duplicate ideas with every final score (final ?? AI), average, status and shortlist rank. */
export function buildChallengeWorkbook(items: IdeaListItem[], scores: RawScore[]): XLSX.WorkBook {
  const rows = items
    .filter((i) => i.status !== 'duplicate' && !i.duplicate_of)
    .map((i) => {
      const mine = scores.filter((s) => s.idea_id === i.id)
      const perCriterion = CRITERIA.map((c) => {
        const s = mine.find((m) => m.criterion === c.key)
        return s ? (effectiveScore(s) ?? '') : ''
      })
      return [
        i.external_id,
        i.title,
        i.direction ?? '',
        i.site ?? '',
        i.theme ?? '',
        i.budget_raw ?? '',
        i.budget_eur ?? '',
        ...perCriterion,
        roundAverage(finalAverage(mine)) ?? '',
        STATUS_LABELS[i.status] ?? i.status,
        i.shortlisted ? (i.shortlist_rank ?? '') : '',
      ]
    })
  const ws = XLSX.utils.aoa_to_sheet([[...CHALLENGE_XLSX_HEADERS], ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Évaluation')
  return wb
}

export function challengeXlsxFilename(challengeTitle: string): string {
  const safe = challengeTitle.replace(/[\\/:*?"<>|]/g, '_').trim() || 'challenge'
  return `${safe}_evaluation.xlsx`
}

export function exportChallengeXlsx(
  challengeTitle: string,
  items: IdeaListItem[],
  scores: RawScore[],
): void {
  XLSX.writeFile(buildChallengeWorkbook(items, scores), challengeXlsxFilename(challengeTitle))
}
