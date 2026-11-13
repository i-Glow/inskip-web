import { z } from 'npm:zod@3'

export const CRITERIA = ['impact', 'feasibility', 'alignment', 'innovation'] as const

export const criterionScoreSchema = z.object({
  criterion: z.enum(CRITERIA),
  score: z.number().int().min(1).max(5),
  justification: z.string().trim().min(1),
})

/** Same schema for mock and (V2) live providers: exactly the 4 criteria, once each. */
export const scoreResponseSchema = z
  .object({ scores: z.array(criterionScoreSchema).length(4) })
  .refine((v) => new Set(v.scores.map((s) => s.criterion)).size === 4, {
    message: 'Chaque critère doit apparaître une seule fois',
  })

export type ScoreResponse = z.infer<typeof scoreResponseSchema>
