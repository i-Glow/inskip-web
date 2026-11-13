import type { Database } from './database.types'

export type CriterionKey = Database['public']['Enums']['criterion']

export interface CriterionDef {
  key: CriterionKey
  label: string
  description: string
}

export const CRITERIA: CriterionDef[] = [
  {
    key: 'impact',
    label: 'Impact',
    description: "Ampleur des bénéfices attendus pour l'entreprise (gains, qualité, sécurité, satisfaction).",
  },
  {
    key: 'feasibility',
    label: 'Faisabilité',
    description: 'Facilité de mise en œuvre au regard du budget, des délais, des compétences et de la technologie.',
  },
  {
    key: 'alignment',
    label: 'Alignement stratégique',
    description: "Cohérence de l'idée avec les priorités stratégiques et les objectifs de l'entreprise.",
  },
  {
    key: 'innovation',
    label: 'Innovation',
    description: "Degré de nouveauté de l'idée par rapport aux pratiques et solutions existantes.",
  },
]

export const CRITERION_KEYS: CriterionKey[] = CRITERIA.map((c) => c.key)
