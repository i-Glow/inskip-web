import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { NewIdeaRow } from '../../types/domain'
import { normalizeRow } from './normalize'

export const REQUIRED_COLUMNS = ['id', 'titre', 'description']
export const EXPECTED_COLUMNS = [
  'id',
  'date_depot',
  'prenom',
  'nom',
  'direction',
  'site',
  'theme',
  'titre',
  'description',
  'benefices_attendus',
  'budget_estime',
]

export type ParseResult =
  | { ok: true; rows: NewIdeaRow[]; skipped: number }
  | { ok: false; error: string }

const stripBom = (s: string) => s.replace(/^﻿/, '')

export function rowsToResult(headers: string[], records: Record<string, string>[]): ParseResult {
  const present = new Set(headers.map((h) => stripBom(h).trim()))
  const missing = REQUIRED_COLUMNS.filter((c) => !present.has(c))
  if (missing.length > 0) {
    return { ok: false, error: `Colonnes obligatoires manquantes : ${missing.join(', ')}` }
  }
  const rows: NewIdeaRow[] = []
  let skipped = 0
  for (const rec of records) {
    const row = normalizeRow(rec)
    if (row) rows.push(row)
    else skipped++
  }
  const seen = new Set<string>()
  const dups = new Set<string>()
  for (const r of rows) {
    if (seen.has(r.external_id)) dups.add(r.external_id)
    seen.add(r.external_id)
  }
  if (dups.size > 0) {
    return { ok: false, error: `Identifiants en double dans le fichier : ${[...dups].join(', ')}` }
  }
  if (rows.some((r) => r.external_id === '')) {
    return { ok: false, error: 'Certaines lignes ont un identifiant (id) vide.' }
  }
  return { ok: true, rows, skipped }
}

export function parseCsvText(text: string): ParseResult {
  const res = Papa.parse<Record<string, string>>(stripBom(text), {
    header: true,
    skipEmptyLines: true,
    delimiter: '',
    transformHeader: (h) => stripBom(h).trim(),
  })
  const headers = res.meta.fields ?? []
  if (headers.length === 0) return { ok: false, error: 'Fichier vide ou illisible.' }
  return rowsToResult(headers, res.data)
}

async function parseXlsx(file: File): Promise<ParseResult> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return { ok: false, error: 'Fichier vide ou illisible.' }
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
  const headerRow = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false })[0] ?? []
  const headers = headerRow.map((h) => String(h).trim())
  const records = json.map((r) => {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(r)) out[k.trim()] = String(v ?? '')
    return out
  })
  return rowsToResult(headers, records)
}

export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase()
  try {
    if (name.endsWith('.csv')) return parseCsvText(await file.text())
    if (name.endsWith('.xlsx')) return await parseXlsx(file)
  } catch {
    return { ok: false, error: 'Impossible de lire le fichier.' }
  }
  return { ok: false, error: 'Format non supporté : utilisez un fichier .csv ou .xlsx.' }
}
