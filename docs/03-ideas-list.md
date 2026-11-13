[← Back to PRD](../PRD.md)

# F3 — Ideas list

**Depends on:** [F2](02-challenge-upload.md)

## Requirements

- Table with: id, title, direction, site, theme, budget, AI average, final average, status, duplicate badge, shortlist badge.
- **Filters:** direction, site, theme (multi-select; empty values grouped as "Non renseigné"), status, score range, free-text search on title/description.
- Sort by any column (budget sorts on the parsed numeric value, unknown budgets last).
- Filters stored in the URL query string.
- Duplicates hidden by default (toggle "afficher les doublons").
- Header actions: "Lancer la notation IA", "Voir la shortlist", "Exporter Excel".
- Progress indicator: X / N ideas reviewed.

## Acceptance

Filtering by direction and sorting by final average is instant on 200 ideas.

## Implementation notes

- Tables/views: `ideas`, `idea_averages`.
- Front: `pages/IdeasPage.tsx`, `components/ideas/*`, `hooks/useIdeas.ts`, `lib/export/ideasXlsx.ts` (Excel export button, see [F7](07-shortlist-export.md)).
