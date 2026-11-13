# PRD — Idea Review Tool for Innovation Challenges (V1)

**Working name:** Idéathon Review (placeholder)
**First client use case:** Hexavia internal innovation challenge (40 ideas, jury in 10 days)
**Primary user:** Camille, consultant, non-technical
**Stack:** React + TypeScript (Vite), Supabase (Postgres, Auth, Edge Functions), Vercel
**UI language:** French. This document is in English.

---

## 1. Context & problem

Camille supports Hexavia (industrial group, 4,000 employees) on its internal innovation challenge. Employees submitted ideas through a form, exported as a CSV file. Today Camille reviews them by hand in Excel, which is slow, makes consistent scoring hard, lets duplicates slip through, and forces her to rebuild a presentable shortlist by hand for the jury.

The jury meets in 10 days, so V1 must be usable within about 5 days.

The tool will be reused for other clients' challenges, so nothing may be specific to Hexavia beyond the expected file format.

## 2. Goals

| # | Goal | Measure of success |
|---|------|--------------------|
| G1 | All ideas in one place, filterable | Camille finds any idea or subset (direction, site, theme, status) in < 10 s |
| G2 | Scoring on the fixed grid | Every idea scored 1–5 on the same 4 criteria |
| G3 | AI-assisted first pass | A proposed score + justification per criterion, editable by Camille (faked in V1) |
| G4 | Duplicate detection | Exact duplicates flagged automatically at import |
| G5 | Client-ready shortlist | ~8 ideas exported as a PDF Camille can send as-is |
| G6 | Reusable | A new challenge is created by uploading a new file |

## 3. Non-goals (out of scope for V1)

- Real AI calls (scoring is mocked, see F5)
- Fuzzy / semantic duplicate detection (exact match only, see F6)
- Configurable criteria or weights (fixed and equal for all challenges)
- Comparison helper between ideas
- Column mapping for other file formats (the file must follow the expected format, see F2)
- Multiple users per challenge, jury accounts or voting
- Editing idea content submitted by employees
- Custom branding on the export
- Mobile-optimized layout (desktop first)

## 4. Key principles

- **No setup:** uploading a file is the whole challenge creation.
- **One obvious next step** on every screen: upload → score → review → shortlist → export.
- **The AI suggests, Camille decides:** suggestions are visibly marked until validated; the export contains only final scores and justifications.
- **Nothing is lost:** autosave, data persisted per user account.

## 5. User flow

1. Camille receives a magic link and logs in.
2. On the challenge list, she clicks "Nouveau challenge" and uploads the form export. The challenge is created with the file name as title; ideas are imported; exact duplicates are flagged.
3. She launches the (mocked) AI scoring for all ideas.
4. She goes through ideas in the list/detail view, adjusts scores and justifications, and validates each one.
5. She selects ~8 ideas for the shortlist and orders them.
6. She exports the shortlist as PDF (and the full list as Excel if needed).

## 6. Functional requirements

### F1 — Authentication (magic link)

- Login page with a single email field; Supabase Auth `signInWithOtp`.
- `/auth/callback` finalizes the session and redirects to the challenge list.
- Session persisted; logout in the header.
- All data scoped to the logged-in user via RLS (§8.3).

**Acceptance:** after logging in from another browser, the user sees all their challenges and scores.

### F2 — Challenge creation by file upload

- Challenge list: title, number of ideas, % reviewed, last update.
- "Nouveau challenge" opens a file picker (`.csv`, `.xlsx`). On upload:
  1. the file is parsed client-side (PapaParse for CSV with separator auto-detection and UTF-8 BOM handling, SheetJS for XLSX);
  2. headers are validated against the expected format below; if a required column is missing, a clear French error lists the missing columns and nothing is created;
  3. a challenge is created with `title` = file name without extension (e.g. `idees_hexavia`);
  4. rows are normalized (§7) and inserted in one batch; rows without `titre` or `description` are skipped and reported ("2 lignes ignorées : titre ou description manquant");
  5. exact duplicates are flagged (F6);
  6. Camille lands on the ideas list with a summary toast ("40 idées importées, 1 doublon détecté").
- The title can be renamed later (inline edit on the list and in the challenge header).
- A challenge can be deleted (with confirmation), deleting all its data.

**Expected file format** (Hexavia form export: `;` separator, UTF-8 with BOM, one row per idea):

| Column | Required | Notes from the Hexavia file |
|--------|----------|-----------------------------|
| `id` | yes | e.g. `IDEA-001`, unique per file |
| `date_depot` | no | mostly `YYYY-MM-DD`, at least one `DD/MM/YYYY` |
| `prenom` | no | |
| `nom` | no | |
| `direction` | no | 9 values (Production, Maintenance, RH, Commercial, Supply chain, QHSE, IT, Finance, R&D) |
| `site` | no | Siège, Lyon, Grenoble, Lille, Nantes, Metz; can be empty |
| `theme` | no | 7 values; can be empty |
| `titre` | yes | |
| `description` | yes | up to ~900 characters |
| `benefices_attendus` | no | can be empty |
| `budget_estime` | no | free text: `40 000 €`, `15k€`, `35k`, `30 000 euros`, `0`, `?`, `80 000 € (déplacement…)`, empty |

**Acceptance:** uploading `idees_hexavia.csv` creates a challenge "idees_hexavia" with 40 ideas in under 10 s, with dates and budgets parsed as described in §7.

### F3 — Ideas list (list/detail view)

- Table with: id, title, direction, site, theme, budget, AI average, final average, status, duplicate badge, shortlist badge.
- **Filters:** direction, site, theme (multi-select; empty values grouped as "Non renseigné"), status, score range, free-text search on title/description.
- Sort by any column (budget sorts on the parsed numeric value, unknown budgets last).
- Filters stored in the URL query string.
- Duplicates hidden by default (toggle "afficher les doublons").
- Header actions: "Lancer la notation IA", "Voir la shortlist", "Exporter Excel".
- Progress indicator: X / N ideas reviewed.

**Acceptance:** filtering by direction and sorting by final average is instant on 200 ideas.

### F4 — Idea detail & scoring

Two-column layout: idea content on the left, scoring panel on the right.

- Left: title, id, submission date, author (first + last name), direction, site, theme, description, expected benefits, budget (raw text as submitted).
- Right, for each of the 4 criteria:
  - AI score (1–5) and AI justification, read-only, labeled "Suggestion IA";
  - final score (1–5 selector) and final justification (textarea), pre-filled from the AI suggestion, editable;
  - visual flag when final score ≠ AI score;
  - short static description of the criterion on hover.
- Average score (computed).
- Buttons: "Valider" (status → `reviewed`), "Ajouter à la shortlist", previous / next idea (respecting the current filters and sort).
- Autosave with ~800 ms debounce and a discreet "enregistré" indicator.

**Acceptance:** Camille can edit a score and its justification, validate, and move to the next idea without leaving the page.

### F5 — AI scoring (mocked in V1)

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

**Acceptance:** 40 ideas scored in under 30 s; every criterion has a score and a non-empty justification; switching to a live provider later requires changes only inside the Edge Function.

### F6 — Duplicate detection (exact match)

- At import, each idea gets a `content_key`: title + description, lowercased, trimmed, with whitespace collapsed (generated column, §8.2).
- Ideas of the same challenge sharing a `content_key` form a group; the earliest one (by submission date, then id) is the original, the others get `duplicate_of = original.id` and status `duplicate`.
- In the Hexavia file this catches IDEA-002 / IDEA-014 (same author, resubmitted).
- Duplicates show a badge linking to the original; the original shows "1 doublon".
- "Ce n'est pas un doublon" on a duplicate removes the flag (`duplicate_of = null`, status back to `new` or `ai_scored`).
- Duplicates are excluded from bulk scoring and cannot be shortlisted.

**Known limitation:** similar ideas worded differently are not detected (e.g. in the Hexavia file, IDEA-001 / IDEA-007 on compressor sensors, IDEA-003 / IDEA-019 on an HR chatbot). Camille identifies those manually; fuzzy detection is a V2 item.

**Acceptance:** importing the Hexavia file flags exactly one duplicate.

### F7 — Shortlist & export

- Shortlist page: ideas with `shortlisted = true`, drag-and-drop ordering, counter "7 / 8" (target 8, warning only).
- "Suggérer" pre-selects the top 8 reviewed, non-duplicate ideas by final average; Camille adjusts.
- Warning if a shortlisted idea is not yet reviewed.
- **Export PDF** (client-side, `@react-pdf/renderer`):
  1. Cover: challenge title, date, number of shortlisted ideas.
  2. Ranking table: rank, title, direction, score per criterion, average.
  3. One page per shortlisted idea: title, author, direction, site, theme, description, expected benefits, budget, final score and final justification per criterion, average.
  - Only final scores and justifications are exported; no mention of AI.
- **Export Excel** (SheetJS): all non-duplicate ideas with every final score, average, status and shortlist rank.

**Acceptance:** Camille exports a PDF she can attach to an email without editing it.

## 7. Business rules

- **Criteria** (fixed, equal weight, identical for all challenges), defined as a constant in the front and as an enum in the database:

| key | Label (FR) |
|-----|-----------|
| `impact` | Impact pour l'entreprise |
| `feasibility` | Faisabilité |
| `alignment` | Alignement avec la stratégie |
| `innovation` | Caractère innovant |

- **Final score** for a criterion = `final_score` if set, else `ai_score`.
- **Average** = mean of the 4 final scores, rounded to 1 decimal; computed in the `idea_averages` view.
- **Status:** `new` → `ai_scored` → `reviewed`; `duplicate` set at import; shortlist is a separate boolean.
- **Date parsing:** accept `YYYY-MM-DD` and `DD/MM/YYYY`; unparseable → `null`, raw value kept.
- **Budget parsing:** keep the raw text in `budget_raw`; derive `budget_eur` (numeric, nullable): strip spaces and `€`/`euros`, `k` → ×1000, ignore trailing comments in parentheses; `?` or empty → `null`; `0` / `0 €` → 0.
- Empty `site` / `theme` / `benefices_attendus` stored as `null`.

## 8. Architecture

### 8.1 Overview

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

### 8.2 Data model

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

### 8.3 Row Level Security

- `challenges`: all operations where `owner_id = auth.uid()`.
- `ideas`: all operations where `exists (select 1 from challenges c where c.id = challenge_id and c.owner_id = auth.uid())`.
- `scores`: same, through `ideas → challenges`.
- Nothing readable by `anon`.

### 8.4 Edge Function `score-idea`

- Input: `{ idea_id: string }`
- Output: `{ scores: [{ criterion, score, justification }] }`
- Env: `AI_MODE` (`mock` | `live`), and in V2 `AI_API_KEY`, `AI_MODEL`.
- Errors: 401 (invalid JWT), 404 (idea not visible to the user), 422 (output fails schema), 502 (provider error, V2). The front shows French messages.
- Shared code in `supabase/functions/_shared/` (cors, supabase client factory, Zod schema, `mockScorer.ts`, `prompt.ts` stub for V2).

### 8.5 Front-end structure

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

### 8.6 Environments & deployment

- Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; SPA rewrite to `index.html`.
- Supabase secrets: `AI_MODE=mock`.
- Supabase Auth: site URL and redirect URL set to the Vercel domain (`/auth/callback`); custom SMTP recommended for magic link deliverability.
- Migrations versioned in `supabase/migrations`; types regenerated after each migration.

## 9. Non-functional requirements

- **Performance:** list < 1 s with 200 ideas; import of 40 ideas < 10 s; bulk mock scoring of 40 ideas < 30 s.
- **Reliability:** autosave; no data lost on refresh; failed scoring calls retryable.
- **Security & privacy:** RLS on every table; no data leaves Supabase in V1; EU hosting; deleting a challenge deletes all its data.
- **Usability:** French UI, plain vocabulary, empty states explaining the next step.

## 10. Milestones (target: usable by day 4–5)

| Day | Deliverable |
|-----|-------------|
| 1 | Schema + RLS + magic link auth + app shell + challenge list |
| 2 | Upload/import with normalization + exact duplicates + ideas list with filters |
| 3 | `score-idea` (mock) + idea detail / scoring panel + bulk scoring |
| 4 | Shortlist + PDF/Excel export + deploy on Vercel |
| 5 | Test with Camille on the real Hexavia file, fixes |

## 11. Open questions for Camille

1. Should author names appear in the jury PDF, or should ideas be anonymized?
2. Will other clients' forms produce the same columns? If not, a column mapping step is needed in V2.
3. Is a PDF enough for the jury session, or does she also need slides?
4. For V2, is it acceptable to send idea texts (without author names) to an AI provider?

## 12. Ideas for V2

- Live AI scoring (switch `AI_MODE` to `live`)
- Fuzzy / semantic duplicate detection
- Column mapping for other form formats
- Share a challenge with colleagues / jury access
- Custom branding on the export
