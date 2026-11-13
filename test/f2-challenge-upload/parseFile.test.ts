import { describe, expect, it } from 'vitest'
import { readFixture } from '../helpers/fixtures'
import { parseCsvText } from '../../src/lib/import/parseFile'

const fixture = readFixture('idees_hexavia.csv')

describe('parseCsvText', () => {
  it('parses the Hexavia fixture', () => {
    const res = parseCsvText(fixture)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows).toHaveLength(40)
    expect(res.skipped).toBe(0)
    expect(res.rows.some((r) => r.submitted_on_raw?.includes('/') && r.submitted_on === '2026-10-03')).toBe(true)
  })

  it('reports missing required columns in French', () => {
    const res = parseCsvText('id;prenom\nA;Jo\n')
    expect(res).toEqual({ ok: false, error: 'Colonnes obligatoires manquantes : titre, description' })
  })

  it('handles comma-separated CSV with BOM', () => {
    const res = parseCsvText('﻿id,titre,description\nA,T,D\n')
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.rows[0].title).toBe('T')
  })

  it('rejects duplicate ids', () => {
    const res = parseCsvText('id,titre,description\nA,T,D\nA,T2,D2\n')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('A')
  })
})
