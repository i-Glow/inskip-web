[← Back to PRD](../PRD.md)

# F5 — AI scoring (mocked in V1)

**Depends on:** [F2](02-challenge-upload.md)

## Requirements

The architecture is the real one; only the provider call is replaced by a mock.

- The front calls the `score-idea` Edge Function **once per idea** (concurrency 3) with a progress bar; failed calls can be retried individually.
- The function verifies the JWT, loads the idea with the user-scoped client (RLS applies), then:
  - if `AI_MODE=mock` (V1 default): generates the result locally, no external call;
  - (V2) if `AI_MODE=live`: calls the LLM with the secret key stored in Supabase secrets.
- **Mock behavior:**
  - scores are **deterministic** per idea (seeded from the idea `id`), so re-running gives the same result and demos are stable;
  - scores are lightly adjusted by available data so results look plausible: e.g. missing benefits or very short description lower the score, missing budget lowers feasibility;
  - justifications are French sentences built from templates that reference the idea's own fields (theme, direction, benefits, budget), 1–2 sentences per criterion;
  - an artificial delay of 300–800 ms simulates latency;
  - `ai_model` stored as `mock-v1`.
- Response is validated against the same Zod schema the live version will use: `{ scores: [{ criterion, score, justification }] }`.
- The function upserts AI fields; it fills `final_*` fields only when they are empty. It never overwrites a reviewed idea's final fields.
- Duplicates are skipped in bulk scoring.

## Acceptance

40 ideas scored in under 30 s; every criterion has a score and a non-empty justification; switching to a live provider later requires changes only inside the Edge Function.

## Implementation notes

- Tables: `scores` (AI and final fields), `ideas.status`.
- Edge Function: `supabase/functions/score-idea/`, shared code in `supabase/functions/_shared/` (see [architecture §4](../architecture.md#4-edge-function-score-idea)).
- Front: `hooks/useAiScoring.ts`, `components/ideas/BulkScoringBar.tsx`, `lib/concurrency.ts`.
- Secrets: `AI_MODE=mock`.
