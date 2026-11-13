[← Back to PRD](PRD.md)

# Architecture

## 1. Overview

```
React SPA (Vercel)
 ├── Supabase JS client ──► Postgres (RLS)   : all CRUD, filters, views
 ├── Supabase Auth       ──► magic link
 └── supabase.functions.invoke('score-idea')
        └── Edge Function ── mock in V1 / LLM API with secret key in V2
```

- The front talks to the database directly; security relies entirely on RLS.
- The Edge Function runs with the caller's JWT, so RLS applies inside it too.
- Supabase project hosted in an EU region (personal data of French employees).

## 2. Data model

```sql
create type idea_status as enum ('new', 'ai_scored', 'reviewed', 'duplicate');
create type criterion as enum ('impact', 'feasibility', 'alignment', 'innovation');

create table challenges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  title text not null,                 -- defaults to the uploaded file name
  source_filename text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table ideas (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  external_id text not null,           -- CSV: id
  submitted_on date,                   -- CSV: date_depot (parsed)
  submitted_on_raw text,               -- CSV: date_depot (as received)
  author_first_name text,              -- CSV: prenom
  author_last_name text,               -- CSV: nom
  direction text,                      -- CSV: direction
  site text,                           -- CSV: site
  theme text,                          -- CSV: theme
  title text not null,                 -- CSV: titre
  description text not null,           -- CSV: description
  expected_benefits text,              -- CSV: benefices_attendus
  budget_raw text,                     -- CSV: budget_estime (as received)
  budget_eur numeric,                  -- CSV: budget_estime (parsed)
  content_key text generated always as (
    lower(regexp_replace(trim(title) || ' ' || trim(description), '\s+', ' ', 'g'))
  ) stored,
  status idea_status not null default 'new',
  duplicate_of uuid references ideas(id) on delete set null,
  shortlisted boolean not null default false,
  shortlist_rank int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (challenge_id, external_id)
);
create index on ideas (challenge_id);
create index on ideas (challenge_id, content_key);

create table scores (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  criterion criterion not null,
  ai_score int check (ai_score between 1 and 5),
  ai_justification text,
  ai_model text,                       -- 'mock-v1' in V1
  ai_generated_at timestamptz,
  final_score int check (final_score between 1 and 5),
  final_justification text,
  updated_at timestamptz default now(),
  unique (idea_id, criterion)
);
```

Plus:

- view `idea_averages` (`idea_id`, `ai_average`, `final_average`, `scored_criteria_count`), `security_invoker = true`;
- RPC `flag_exact_duplicates(p_challenge_id uuid)` (`security invoker`) called right after import: sets `duplicate_of` / `status` per F6 and returns the number of duplicates;
- `updated_at` triggers.

## 3. Row Level Security

- `challenges`: all operations where `owner_id = auth.uid()`.
- `ideas`: all operations where `exists (select 1 from challenges c where c.id = challenge_id and c.owner_id = auth.uid())`.
- `scores`: same, through `ideas → challenges`.
- Nothing readable by `anon`.

## 4. Edge Function `score-idea`

- Input: `{ idea_id: string }`
- Output: `{ scores: [{ criterion, score, justification }] }`
- Env: `AI_MODE` (`mock` | `live`), and in V2 `AI_API_KEY`, `AI_MODEL`.
- Errors: 401 (invalid JWT), 404 (idea not visible to the user), 422 (output fails schema), 502 (provider error, V2). The front shows French messages.
- Shared code in `supabase/functions/_shared/` (cors, supabase client factory, Zod schema, `mockScorer.ts`, `prompt.ts` stub for V2).

## 5. Front-end structure

```
src/
  main.tsx
  App.tsx                       # router + providers
  lib/
    supabase.ts
    database.types.ts           # supabase gen types
    criteria.ts                 # the 4 criteria: key, label, description
    import/parseFile.ts         # csv/xlsx → rows, header validation
    import/normalize.ts         # dates, budgets, empty values
    export/shortlistPdf.tsx
    export/ideasXlsx.ts
    scoring.ts                  # final score fallback, average
    concurrency.ts              # promise pool for bulk scoring
  types/
    domain.ts
  hooks/
    useAuth.ts
    useChallenges.ts            # list, create from file, rename, delete
    useIdeas.ts                 # list + filters from URL
    useIdea.ts
    useScores.ts                # read + debounced autosave
    useAiScoring.ts             # single + bulk with progress/retry
    useShortlist.ts             # toggle, reorder, suggest
  components/
    layout/ AppShell, Header, ProtectedRoute
    challenges/ ChallengeCard, NewChallengeUpload, EditableTitle
    ideas/ IdeasTable, IdeaFilters, StatusBadge, DuplicateBadge, BulkScoringBar
    idea/ IdeaContent, ScoringPanel, CriterionScoreRow, IdeaNav
    shortlist/ ShortlistList, ExportButtons
    ui/ Button, Input, Select, Textarea, Modal, Toast, ProgressBar, EmptyState
  pages/
    LoginPage.tsx               # /login
    AuthCallbackPage.tsx        # /auth/callback
    ChallengesPage.tsx          # /challenges
    IdeasPage.tsx               # /challenges/:id/ideas
    IdeaDetailPage.tsx          # /challenges/:id/ideas/:ideaId
    ShortlistPage.tsx           # /challenges/:id/shortlist
supabase/
  migrations/
  functions/
    _shared/
    score-idea/index.ts
```

Suggested libraries: React Router, TanStack Query, Tailwind CSS, Zod, PapaParse, SheetJS, @react-pdf/renderer, dnd-kit.

## 6. Environments & deployment

- Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; SPA rewrite to `index.html`.
- Supabase secrets: `AI_MODE=mock`.
- Supabase Auth: site URL and redirect URL set to the Vercel domain (`/auth/callback`); custom SMTP recommended for magic link deliverability.
- Migrations versioned in `supabase/migrations`; types regenerated after each migration.
