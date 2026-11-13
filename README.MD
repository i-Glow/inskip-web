# INSKIP Web

Web app for managing challenges, importing ideas, scoring them (manually and with AI) and exporting shortlists. See `docs/PRD.md`.

## Stack

React + TypeScript (Vite), Tailwind CSS v4, Supabase (auth, DB, edge functions), deployed on Vercel.

## Setup

```sh
npm install
cp .env.example .env.local   # fill in Supabase URL and anon key
npm run dev
```

Other scripts: `npm run build`, `npm run lint`.

## Tests

```bash
npm test          # vitest run (once)
npm run test:watch
```

Vitest + React Testing Library + jsdom. All tests live under `test/`, never in `src/`:

```
test/
  setup.ts            jest-dom matchers + cleanup
  fixtures/           sample files (CSV, ...)
  helpers/            supabase mock, render-with-providers
  f1-auth/            one folder per feature, named fNN-<slug> after docs/NN-<slug>.md
  f2-challenge-upload/
```

Supabase is always mocked (`vi.mock` of `src/lib/supabase`, see `test/helpers/supabase.ts`); tests never need `.env`. `tsc -b` typechecks the tests via `tsconfig.test.json`.

## Structure

```
src/
  main.tsx, App.tsx, index.css, vite-env.d.ts
  lib/        supabase, database.types, criteria, scoring, concurrency, import/, export/
  types/      domain types
  hooks/      useAuth, useChallenges, useIdeas, useIdea, useScores, useAiScoring, useShortlist
  components/ layout/ challenges/ ideas/ idea/ shortlist/ ui/
  pages/      Login, AuthCallback, Challenges, Ideas, IdeaDetail, Shortlist
supabase/
  migrations/
  functions/  _shared/ (cors, supabaseClient, schema, mockScorer, prompt), score-idea/
```

## CI / déploiement

Workflow : `.github/workflows/ci.yml`. La intégration Git de Vercel est désactivée (`vercel.json`) : la CI est le seul déployeur.

| Événement | Jobs |
|---|---|
| push sur toute branche / `workflow_dispatch` | `test` (lint, tests, build) puis `deploy-vercel` en **preview** (front uniquement) |
| push sur `master` | `test` → `deploy-supabase` (`db push` + déploiement de `score-idea`) → `deploy-vercel` en **production** |

Secrets GitHub : `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `VERCEL_TOKEN`.
Variables GitHub : `SUPABASE_PROJECT_REF`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
L'environnement GitHub `production` est utilisé par `deploy-supabase` (approbation manuelle possible).
