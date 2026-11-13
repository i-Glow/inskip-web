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

- Real AI calls (scoring is mocked, see [F5](features/05-ai-scoring-mock.md))
- Fuzzy / semantic duplicate detection (exact match only, see [F6](features/06-duplicate-detection.md))
- Configurable criteria or weights (fixed and equal for all challenges)
- Comparison helper between ideas
- Column mapping for other file formats (the file must follow the expected format, see [F2](features/02-challenge-upload.md))
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

## 6. Features

Each feature has its own spec file with requirements, acceptance criteria and implementation notes. Technical design (data model, RLS, Edge Function, front structure, deployment) is in [architecture.md](architecture.md).

| # | Feature | Depends on |
|---|---------|------------|
| F1 | [Authentication (magic link)](features/01-authentication.md) | — |
| F2 | [Challenge creation by file upload](features/02-challenge-upload.md) | F1 |
| F3 | [Ideas list](features/03-ideas-list.md) | F2 |
| F4 | [Idea detail & scoring](features/04-idea-detail-scoring.md) | F3, F5 |
| F5 | [AI scoring (mocked in V1)](features/05-ai-scoring-mock.md) | F2 |
| F6 | [Duplicate detection (exact match)](features/06-duplicate-detection.md) | F2 |
| F7 | [Shortlist & export](features/07-shortlist-export.md) | F4 |

## 7. Shared business rules

Used across several features.

- **Criteria** (fixed, equal weight, identical for all challenges), defined as a constant in the front (`lib/criteria.ts`) and as an enum in the database:

| key | Label (FR) |
|-----|-----------|
| `impact` | Impact pour l'entreprise |
| `feasibility` | Faisabilité |
| `alignment` | Alignement avec la stratégie |
| `innovation` | Caractère innovant |

- **Final score** for a criterion = `final_score` if set, else `ai_score`.
- **Average** = mean of the 4 final scores, rounded to 1 decimal; computed in the `idea_averages` view.
- **Status:** `new` → `ai_scored` → `reviewed`; `duplicate` set at import ([F6](features/06-duplicate-detection.md)); shortlist is a separate boolean ([F7](features/07-shortlist-export.md)).

## 8. Non-functional requirements

- **Performance:** list < 1 s with 200 ideas; import of 40 ideas < 10 s; bulk mock scoring of 40 ideas < 30 s.
- **Reliability:** autosave; no data lost on refresh; failed scoring calls retryable.
- **Security & privacy:** RLS on every table; no data leaves Supabase in V1; EU hosting; deleting a challenge deletes all its data.
- **Usability:** French UI, plain vocabulary, empty states explaining the next step.

## 9. Milestones (target: usable by day 4–5)

| Day | Deliverable |
|-----|-------------|
| 1 | Schema + RLS + magic link auth + app shell + challenge list |
| 2 | Upload/import with normalization + exact duplicates + ideas list with filters |
| 3 | `score-idea` (mock) + idea detail / scoring panel + bulk scoring |
| 4 | Shortlist + PDF/Excel export + deploy on Vercel |
| 5 | Test with Camille on the real Hexavia file, fixes |

## 10. Open questions for Camille

1. Should author names appear in the jury PDF, or should ideas be anonymized?
2. Will other clients' forms produce the same columns? If not, a column mapping step is needed in V2.
3. Is a PDF enough for the jury session, or does she also need slides?
4. For V2, is it acceptable to send idea texts (without author names) to an AI provider?

## 11. Ideas for V2

- Live AI scoring (switch `AI_MODE` to `live`)
- Fuzzy / semantic duplicate detection
- Column mapping for other form formats
- Share a challenge with colleagues / jury access
- Custom branding on the export
