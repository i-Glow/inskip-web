import { describe, expect, it } from 'vitest'
import { normalizeRow, parseBudget, parseDate } from '../../src/lib/import/normalize'

describe('parseBudget', () => {
  const cases: [string, number | null][] = [
    ['40 000 €', 40000],
    ['40 000 €', 40000],
    ['15k€', 15000],
    ['35k', 35000],
    ['35K', 35000],
    ['30 000 euros', 30000],
    ['30 000 EUROS', 30000],
    ['0', 0],
    ['0 €', 0],
    ['?', null],
    ['', null],
    ['abc', null],
    ['80 000 € (déplacement des machines et formation)', 80000],
    ['1,5k', 1500],
    ['12,50 €', 12.5],
  ]
  it.each(cases)('%j -> %j', (raw, expected) => {
    expect(parseBudget(raw)).toBe(expected)
  })
})

describe('parseDate', () => {
  it('parses ISO', () => expect(parseDate('2026-09-15')).toBe('2026-09-15'))
  it('parses DD/MM/YYYY', () => expect(parseDate('03/10/2026')).toBe('2026-10-03'))
  it('rejects invalid dates', () => {
    expect(parseDate('2026-02-30')).toBeNull()
    expect(parseDate('31/04/2026')).toBeNull()
    expect(parseDate('hier')).toBeNull()
    expect(parseDate('')).toBeNull()
  })
})

describe('normalizeRow', () => {
  it('skips rows without titre or description', () => {
    expect(normalizeRow({ id: 'A', titre: ' ', description: 'x' })).toBeNull()
    expect(normalizeRow({ id: 'A', titre: 'x', description: '' })).toBeNull()
  })
  it('maps and nulls empties', () => {
    const r = normalizeRow({ id: ' A ', date_depot: 'n/a', titre: ' T ', description: 'D', site: '', budget_estime: '15k€' })
    expect(r).toMatchObject({
      external_id: 'A', submitted_on: null, submitted_on_raw: 'n/a', title: 'T',
      site: null, theme: null, budget_raw: '15k€', budget_eur: 15000,
    })
  })
})
