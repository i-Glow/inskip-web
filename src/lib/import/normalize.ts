import type { NewIdeaRow } from '../../types/domain'

export function emptyToNull(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

function validYmd(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Accepts YYYY-MM-DD and DD/MM/YYYY; returns ISO date or null. */
export function parseDate(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim()
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) return validYmd(+m[1], +m[2], +m[3])
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (m) return validYmd(+m[3], +m[2], +m[1])
  return null
}

/** Free-text budget to euros; null when empty or unparseable. */
export function parseBudget(raw: string | null | undefined): number | null {
  let s = (raw ?? '').toLowerCase()
  s = s.replace(/\([^)]*\)?\s*$/, '') // trailing comment
  s = s.replace(/\s+/g, '').replace(/€/g, '').replace(/euros?/g, '')
  if (s === '') return null
  const m = /^(\d+(?:[.,]\d+)*)(k?)$/.exec(s)
  if (!m) return null
  let num = m[1]
  if (num.includes(',') && num.includes('.')) {
    num = num.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(num)) {
    num = num.replace(/\./g, '') // 40.000 -> thousands separator
  } else {
    num = num.replace(',', '.')
  }
  const n = Number(num)
  if (!Number.isFinite(n)) return null
  const value = m[2] ? n * 1000 : n
  return Math.round(value * 100) / 100
}

/** Normalizes one raw record; null when titre or description is blank. */
export function normalizeRow(row: Record<string, string>): NewIdeaRow | null {
  const get = (k: string) => emptyToNull(row[k])
  const title = get('titre')
  const description = get('description')
  if (!title || !description) return null
  const dateRaw = get('date_depot')
  const budgetRaw = get('budget_estime')
  return {
    external_id: get('id') ?? '',
    submitted_on: parseDate(dateRaw),
    submitted_on_raw: dateRaw,
    author_first_name: get('prenom'),
    author_last_name: get('nom'),
    direction: get('direction'),
    site: get('site'),
    theme: get('theme'),
    title,
    description,
    expected_benefits: get('benefices_attendus'),
    budget_raw: budgetRaw,
    budget_eur: parseBudget(budgetRaw),
  }
}
