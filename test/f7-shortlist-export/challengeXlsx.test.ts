import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import {
  CHALLENGE_XLSX_HEADERS,
  buildChallengeWorkbook,
  challengeXlsxFilename,
} from '../../src/lib/export/ideasXlsx'
import { makeIdea } from '../f3-ideas-list/helpers'

describe('buildChallengeWorkbook', () => {
  const x = makeIdea({ title: 'X', status: 'reviewed', shortlisted: true, shortlist_rank: 3 })
  const y = makeIdea({ title: 'Y', status: 'new' })
  const d = makeIdea({ title: 'D', status: 'duplicate', duplicate_of: x.id })
  const scores = [
    { idea_id: x.id, criterion: 'impact', ai_score: 2, final_score: 4 },
    { idea_id: x.id, criterion: 'innovation', ai_score: 3, final_score: null },
  ]
  const wb = buildChallengeWorkbook([x, y, d], scores)
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]])

  it('includes the estimated budget (text and €)', () => {
    const z = makeIdea({ title: 'Z', budget_raw: '10 k€', budget_eur: 10000 })
    const w = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      buildChallengeWorkbook([z], []).Sheets['Évaluation'],
    )
    expect(CHALLENGE_XLSX_HEADERS).toContain('Budget estimé (texte)')
    expect(CHALLENGE_XLSX_HEADERS).toContain('Budget estimé (€)')
    expect(w[0]).toMatchObject({ 'Budget estimé (texte)': '10 k€', 'Budget estimé (€)': 10000 })
  })

  it('excludes duplicates', () => {
    expect(rows.map((r) => r['Titre'])).toEqual(['X', 'Y'])
  })

  it('has per-criterion columns, average, status and rank', () => {
    expect(CHALLENGE_XLSX_HEADERS).toContain('Alignement stratégique')
    expect(rows[0]).toMatchObject({
      Impact: 4,
      Innovation: 3,
      Moyenne: 3.5,
      Statut: 'Évaluée',
      'Rang shortlist': 3,
    })
    expect(rows[1]['Rang shortlist'] ?? '').toBe('')
    expect(rows[1]['Statut']).toBe('Nouvelle')
  })

  it('names the file', () => {
    expect(challengeXlsxFilename('Défi')).toBe('Défi_evaluation.xlsx')
  })
})
