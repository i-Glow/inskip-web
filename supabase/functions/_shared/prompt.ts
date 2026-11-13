// V2 stub: prompt for the live provider. Unused while AI_MODE=mock.
export interface PromptIdea {
  title: string
  description: string
  direction?: string | null
  theme?: string | null
  expected_benefits?: string | null
  budget_eur?: number | null
}

export function buildPrompt(idea: PromptIdea): string {
  return [
    'Tu es un évaluateur d’idées d’innovation interne.',
    'Note l’idée de 1 à 5 (entier) sur : impact, feasibility, alignment, innovation.',
    'Réponds en JSON : { "scores": [{ "criterion", "score", "justification" }] } avec une justification courte en français.',
    '',
    `Titre : ${idea.title}`,
    `Description : ${idea.description}`,
    `Direction : ${idea.direction ?? 'non précisée'}`,
    `Thème : ${idea.theme ?? 'non précisé'}`,
    `Bénéfices attendus : ${idea.expected_benefits ?? 'non précisés'}`,
    `Budget (EUR) : ${idea.budget_eur ?? 'non précisé'}`,
  ].join('\n')
}
