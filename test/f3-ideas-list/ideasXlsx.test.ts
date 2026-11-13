import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { buildIdeasWorkbook, ideasXlsxFilename } from '../../src/lib/export/ideasXlsx'
import { makeIdea } from './helpers'

describe('buildIdeasWorkbook', () => {
  it('has French headers and one row per idea', () => {
    const orig = makeIdea({ external_id: 'A1' })
    const dup = makeIdea({ status: 'duplicate', duplicate_of: orig.id, shortlisted: true })
    const full = makeIdea({
      title: 'Solaire',
      direction: 'RH',
      budget_raw: '10 k€',
      budget_eur: 10000,
      aiAverage: 3.46,
      finalAverage: 4,
      status: 'reviewed',
    })
    const wb = buildIdeasWorkbook([orig, dup, full])
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]])
    expect(rows).toHaveLength(3)
    expect(rows[1]['Doublon de']).toBe('A1')
    expect(rows[1]['Shortlist']).toBe('Oui')
    expect(rows[1]['Statut']).toBe('Doublon')
    expect(rows[2]).toMatchObject({
      Titre: 'Solaire',
      'Budget estimé (texte)': '10 k€',
      'Budget estimé (€)': 10000,
      'Moyenne IA': 3.5,
      'Moyenne finale': 4,
      Statut: 'Évaluée',
    })
  })
  it('writes the header row', () => {
    const wb = buildIdeasWorkbook([])
    const aoa = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 })
    expect(aoa[0]).toEqual([
      'Id', 'Titre', 'Direction', 'Site', 'Thème', 'Budget estimé (texte)', 'Budget estimé (€)',
      'Moyenne IA', 'Moyenne finale', 'Statut', 'Doublon de', 'Shortlist',
    ])
  })
  it('builds the filename', () => {
    expect(ideasXlsxFilename('Mon/challenge')).toBe('Mon_challenge_idees.xlsx')
  })
})
