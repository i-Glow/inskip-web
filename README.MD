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
