[← Back to PRD](../PRD.md)

# F7 — Shortlist & export

**Depends on:** [F4](04-idea-detail-scoring.md)

## Requirements

- Shortlist page: ideas with `shortlisted = true`, drag-and-drop ordering, counter "7 / 8" (target 8, warning only).
- "Ajouter des idées" opens a modal listing the challenge's ideas that are neither shortlisted nor duplicates, each with its ID, title and final average ("—" if none), sorted by final average descending (unscored last); a search box filters on ID or title and a checkbox selects rows. "Ajouter (N)" appends the selection to the end of the shortlist in that order and toasts "N idée(s) ajoutée(s) à la shortlist". Unreviewed ideas are allowed and show the "Non évaluée" badge.
- Shortlist rows show the "Budget estimé"; titles wrap on several lines (no truncation).
- "Suggérer" pre-selects the top 8 reviewed, non-duplicate ideas by final average; Camille adjusts.
- Warning if a shortlisted idea is not yet reviewed.
- **Export PDF** (client-side, `@react-pdf/renderer`):
  1. Cover: challenge title, date, number of shortlisted ideas.
  2. Ranking table: rank, title, direction, budget estimé, score per criterion, average.
  3. One page per shortlisted idea: title, author, direction, site, theme, description, expected benefits, budget estimé, final score and final justification per criterion, average.
  - Only final scores and justifications are exported; no mention of AI.
- **Export Excel** (SheetJS): all non-duplicate ideas with "Budget estimé (texte)" and "Budget estimé (€)", every final score, average, status and shortlist rank.

## Acceptance

Camille exports a PDF she can attach to an email without editing it.

## Implementation notes

- Columns: `ideas.shortlisted`, `ideas.shortlist_rank`; view `idea_averages`.
- Front: `pages/ShortlistPage.tsx`, `components/shortlist/*`, `hooks/useShortlist.ts` (toggle, add several, reorder, suggest), `lib/export/shortlistPdf.tsx`, `lib/export/ideasXlsx.ts`.
- Libraries: @react-pdf/renderer, SheetJS, dnd-kit.
