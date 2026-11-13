import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { userClient } from '../_shared/supabaseClient.ts'
import { scoreResponseSchema } from '../_shared/schema.ts'
import { MOCK_MODEL, mockDelayMs, mockScore } from '../_shared/mockScorer.ts'

Deno.serve(async (req) => {
  const pre = handleOptions(req)
  if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'Méthode non autorisée.' }, 405)

  const supabase = userClient(req)
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) return jsonResponse({ error: 'Session invalide.' }, 401)

  let ideaId: unknown
  try {
    ideaId = (await req.json())?.idea_id
  } catch {
    ideaId = undefined
  }
  if (typeof ideaId !== 'string' || ideaId === '') {
    return jsonResponse({ error: 'Identifiant d’idée manquant.' }, 400)
  }

  const { data: idea, error: ideaError } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', ideaId)
    .maybeSingle()
  if (ideaError || !idea) return jsonResponse({ error: 'Idée introuvable.' }, 404)
  if (idea.status === 'duplicate') {
    return jsonResponse({ error: 'Cette idée est un doublon et ne peut pas être notée.' }, 409)
  }

  const mode = Deno.env.get('AI_MODE') ?? 'mock'
  if (mode === 'live') return jsonResponse({ error: 'Mode live non disponible en V1.' }, 501)

  await new Promise((r) => setTimeout(r, mockDelayMs(idea.id)))
  const parsed = scoreResponseSchema.safeParse(mockScore(idea))
  if (!parsed.success) {
    return jsonResponse({ error: 'La réponse de l’IA est invalide.' }, 422)
  }
  const { scores } = parsed.data

  const now = new Date().toISOString()
  for (const s of scores) {
    const { data: existing, error: readError } = await supabase
      .from('scores')
      .select('final_score, final_justification')
      .eq('idea_id', idea.id)
      .eq('criterion', s.criterion)
      .maybeSingle()
    if (readError) return jsonResponse({ error: 'Lecture des notes impossible.' }, 500)

    const row: Record<string, unknown> = {
      idea_id: idea.id,
      criterion: s.criterion,
      ai_score: s.score,
      ai_justification: s.justification,
      ai_model: MOCK_MODEL,
      ai_generated_at: now,
    }
    if (idea.status !== 'reviewed') {
      if (existing?.final_score == null) row.final_score = s.score
      if (existing?.final_justification == null) row.final_justification = s.justification
    }
    const { error: upsertError } = await supabase
      .from('scores')
      .upsert(row as never, { onConflict: 'idea_id,criterion' })
    if (upsertError) return jsonResponse({ error: 'Enregistrement des notes impossible.' }, 500)
  }

  if (idea.status === 'new') {
    const { error } = await supabase.from('ideas').update({ status: 'ai_scored' }).eq('id', idea.id)
    if (error) return jsonResponse({ error: 'Mise à jour du statut impossible.' }, 500)
  }

  return jsonResponse({ scores })
})
