/* oxlint-disable react/only-export-components */
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import type { Tables } from '../database.types'
import { CRITERIA } from '../criteria'
import { displayBudget } from '../ideasList'
import { effectiveScore, finalAverage, formatAverage } from '../scoring'

type Idea = Tables<'ideas'>
type Score = Tables<'scores'>

export interface PdfCriterionScore {
  label: string
  score: number | null
  justification: string
}

export interface PdfIdeaPage {
  title: string
  author: string
  direction: string
  site: string
  theme: string
  description: string
  expectedBenefits: string
  budget: string
  criteria: PdfCriterionScore[]
  average: number | null
}

export interface PdfRankingRow {
  rank: number
  title: string
  direction: string
  budget: string
  scores: (number | null)[]
  average: number | null
}

export interface ShortlistPdfModel {
  title: string
  dateLabel: string
  count: number
  criteriaLabels: string[]
  ranking: PdfRankingRow[]
  pages: PdfIdeaPage[]
}

const DASH = '—'
const orDash = (v: string | null | undefined) => (v && v.trim() ? v : DASH)

/** Pure: builds the data the PDF renders. Only final values; shortlisted ideas by rank. */
export function buildShortlistPdfModel(
  challenge: { title: string },
  ideas: Idea[],
  scores: Score[],
  now: Date = new Date(),
): ShortlistPdfModel {
  const shortlisted = ideas
    .filter((i) => i.shortlisted)
    .sort((a, b) => (a.shortlist_rank ?? Infinity) - (b.shortlist_rank ?? Infinity))

  const rows = shortlisted.map((idea) => {
    const mine = scores.filter((s) => s.idea_id === idea.id)
    const criteria = CRITERIA.map((c) => {
      const s = mine.find((m) => m.criterion === c.key)
      return {
        label: c.label,
        score: s ? effectiveScore(s) : null,
        justification: s ? (s.final_justification ?? s.ai_justification ?? '') : '',
      }
    })
    const average = finalAverage(
      mine.map((s) => ({ ai_score: s.ai_score, final_score: s.final_score })),
    )
    return { idea, criteria, average }
  })

  return {
    title: challenge.title,
    dateLabel: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(now),
    count: shortlisted.length,
    criteriaLabels: CRITERIA.map((c) => c.label),
    ranking: rows.map((r, i) => ({
      rank: i + 1,
      title: r.idea.title,
      direction: orDash(r.idea.direction),
      budget: displayBudget(r.idea.budget_raw),
      scores: r.criteria.map((c) => c.score),
      average: r.average,
    })),
    pages: rows.map((r) => ({
      title: r.idea.title,
      author: orDash([r.idea.author_first_name, r.idea.author_last_name].filter(Boolean).join(' ')),
      direction: orDash(r.idea.direction),
      site: orDash(r.idea.site),
      theme: orDash(r.idea.theme),
      description: orDash(r.idea.description),
      expectedBenefits: orDash(r.idea.expected_benefits),
      budget: displayBudget(r.idea.budget_raw),
      criteria: r.criteria,
      average: r.average,
    })),
  }
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#111827' },
  cover: { justifyContent: 'center', alignItems: 'center' },
  coverTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  coverText: { fontSize: 14, marginTop: 6, color: '#374151' },
  h1: { fontSize: 18, marginBottom: 12, fontWeight: 'bold' },
  h2: { fontSize: 12, marginTop: 12, marginBottom: 3, fontWeight: 'bold' },
  row: { flexDirection: 'row', borderBottom: '1pt solid #e5e7eb', paddingVertical: 4 },
  head: { fontWeight: 'bold', backgroundColor: '#f3f4f6' },
  cRank: { width: '6%' },
  cTitle: { width: '26%', paddingRight: 4 },
  cDir: { width: '14%', paddingRight: 4 },
  cBudget: { width: '12%', paddingRight: 4 },
  cScore: { width: '9%', textAlign: 'center' },
  muted: { color: '#6b7280' },
})

export function ShortlistDocument({ model }: { model: ShortlistPdfModel }) {
  const short = ['Impact', 'Faisab.', 'Align.', 'Innov.']
  return (
    <Document title={`${model.title} - shortlist`}>
      <Page size="A4" style={[styles.page, styles.cover]}>
        <Text style={styles.coverTitle}>{model.title}</Text>
        <Text style={styles.coverText}>Shortlist</Text>
        <Text style={styles.coverText}>{model.dateLabel}</Text>
        <Text style={styles.coverText}>
          {model.count} idée{model.count > 1 ? 's' : ''} retenue{model.count > 1 ? 's' : ''}
        </Text>
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Classement</Text>
        <View style={[styles.row, styles.head]}>
          <Text style={styles.cRank}>Rang</Text>
          <Text style={styles.cTitle}>Titre</Text>
          <Text style={styles.cDir}>Direction</Text>
          <Text style={styles.cBudget}>Budget estimé</Text>
          {model.criteriaLabels.map((l, i) => (
            <Text key={l} style={styles.cScore}>
              {short[i] ?? l}
            </Text>
          ))}
          <Text style={styles.cScore}>Moy.</Text>
        </View>
        {model.ranking.map((r) => (
          <View key={r.rank} style={styles.row} wrap={false}>
            <Text style={styles.cRank}>{r.rank}</Text>
            <Text style={styles.cTitle}>{r.title}</Text>
            <Text style={styles.cDir}>{r.direction}</Text>
            <Text style={styles.cBudget}>{r.budget}</Text>
            {r.scores.map((s, i) => (
              <Text key={i} style={styles.cScore}>
                {s ?? DASH}
              </Text>
            ))}
            <Text style={styles.cScore}>{formatAverage(r.average)}</Text>
          </View>
        ))}
      </Page>
      {model.pages.map((p, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          <Text style={styles.h1}>
            {idx + 1}. {p.title}
          </Text>
          <Text style={styles.muted}>
            {p.author} · {p.direction} · {p.site} · {p.theme}
          </Text>
          <Text style={styles.h2}>Description</Text>
          <Text>{p.description}</Text>
          <Text style={styles.h2}>Bénéfices attendus</Text>
          <Text>{p.expectedBenefits}</Text>
          <Text style={styles.h2}>Budget estimé</Text>
          <Text>{p.budget}</Text>
          <Text style={styles.h2}>Évaluation</Text>
          {p.criteria.map((c) => (
            <View key={c.label} style={{ marginBottom: 6 }} wrap={false}>
              <Text style={{ fontWeight: 'bold' }}>
                {c.label} : {c.score ?? DASH} / 5
              </Text>
              <Text>{c.justification || DASH}</Text>
            </View>
          ))}
          <Text style={[styles.h2, { fontSize: 13 }]}>Moyenne : {formatAverage(p.average)} / 5</Text>
        </Page>
      ))}
    </Document>
  )
}

export function shortlistPdfFilename(challengeTitle: string): string {
  const safe = challengeTitle.replace(/[\\/:*?"<>|]/g, '_').trim() || 'challenge'
  return `${safe}_shortlist.pdf`
}

/** Renders the PDF in the browser and triggers a download. */
export async function downloadShortlistPdf(
  challenge: { title: string },
  ideas: Idea[],
  scores: Score[],
): Promise<void> {
  const model = buildShortlistPdfModel(challenge, ideas, scores)
  const blob = await pdf(<ShortlistDocument model={model} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = shortlistPdfFilename(challenge.title)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
