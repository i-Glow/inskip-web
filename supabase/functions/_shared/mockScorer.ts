// Pure TypeScript, NO imports: shared by the Edge Function and the app tests.

export type MockCriterion = 'impact' | 'feasibility' | 'alignment' | 'innovation'

export interface MockIdea {
  id: string
  title?: string | null
  description?: string | null
  direction?: string | null
  theme?: string | null
  expected_benefits?: string | null
  budget_eur?: number | null
}

export interface MockScore {
  criterion: MockCriterion
  score: number
  justification: string
}

export const MOCK_MODEL = 'mock-v1'
export const MOCK_DELAY_RANGE_MS = { min: 300, max: 800 } as const
export const SHORT_DESCRIPTION_LENGTH = 150

const CRITERIA: MockCriterion[] = ['impact', 'feasibility', 'alignment', 'innovation']

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic delay in the 300-800 ms range, seeded from the idea id. */
export function mockDelayMs(id: string): number {
  const r = mulberry32(hashString(`delay:${id}`))()
  return Math.round(MOCK_DELAY_RANGE_MS.min + r * (MOCK_DELAY_RANGE_MS.max - MOCK_DELAY_RANGE_MS.min))
}

const clamp = (n: number) => Math.min(5, Math.max(1, n))
const pick = <T>(arr: T[], r: number): T => arr[Math.floor(r * arr.length) % arr.length]
const filled = (s?: string | null) => !!s && s.trim().length > 0

export function mockScore(idea: MockIdea): { scores: MockScore[] } {
  const rand = mulberry32(hashString(idea.id))
  const base: Record<MockCriterion, number> = {
    impact: 2 + Math.floor(rand() * 4),
    feasibility: 2 + Math.floor(rand() * 4),
    alignment: 2 + Math.floor(rand() * 4),
    innovation: 2 + Math.floor(rand() * 4),
  }
  const variants = CRITERIA.map(() => rand())

  const noBenefits = !filled(idea.expected_benefits)
  const shortDesc = (idea.description ?? '').trim().length < SHORT_DESCRIPTION_LENGTH
  const noBudget = idea.budget_eur == null

  if (noBenefits) {
    base.impact -= 1
    base.alignment -= 1
  }
  if (shortDesc) {
    base.impact -= 1
    base.alignment -= 1
  }
  if (noBudget) base.feasibility -= 1

  const theme = filled(idea.theme) ? idea.theme!.trim() : 'non précisé'
  const direction = filled(idea.direction) ? idea.direction!.trim() : 'non précisée'
  const benefits = filled(idea.expected_benefits)
    ? idea.expected_benefits!.trim().slice(0, 80)
    : null
  const budget = noBudget ? null : `${Math.round(idea.budget_eur!).toLocaleString('fr-FR')} €`

  const text: Record<MockCriterion, (v: number) => string> = {
    impact: (v) =>
      benefits
        ? pick(
            [
              `Les bénéfices attendus (« ${benefits} ») laissent entrevoir un impact réel sur le thème ${theme}.`,
              `L’impact sur le thème ${theme} est étayé par les bénéfices annoncés : ${benefits}.`,
            ],
            v,
          )
        : `Les bénéfices attendus ne sont pas renseignés, ce qui limite l’impact estimé sur le thème ${theme}.`,
    feasibility: (v) =>
      budget
        ? pick(
            [
              `Le budget de ${budget} permet d’évaluer la faisabilité du projet pour la direction ${direction}.`,
              `Avec un budget de ${budget}, la mise en œuvre semble réaliste pour la direction ${direction}.`,
            ],
            v,
          )
        : `Aucun budget n’est indiqué, la faisabilité pour la direction ${direction} reste difficile à estimer.`,
    alignment: (v) =>
      pick(
        [
          `L’idée s’inscrit ${shortDesc || noBenefits ? 'partiellement' : 'bien'} dans les priorités de la direction ${direction} sur le thème ${theme}.`,
          `L’alignement avec la direction ${direction} et le thème ${theme} est ${shortDesc || noBenefits ? 'à préciser' : 'cohérent'}.`,
        ],
        v,
      ) + (shortDesc ? ' La description est courte.' : ''),
    innovation: (v) =>
      pick(
        [
          `Le caractère innovant de l’approche sur le thème ${theme} est ${base.innovation >= 4 ? 'marqué' : 'modéré'}.`,
          `Pour la direction ${direction}, la proposition sur ${theme} apporte une originalité ${base.innovation >= 4 ? 'notable' : 'limitée'}.`,
        ],
        v,
      ),
  }

  return {
    scores: CRITERIA.map((criterion, i) => {
      const score = clamp(base[criterion])
      return { criterion, score, justification: text[criterion](variants[i]) }
    }),
  }
}
