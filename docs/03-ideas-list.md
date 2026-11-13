[← Back to PRD](../PRD.md)

# F3 — Ideas list

**Depends on:** [F2](02-challenge-upload.md)

## Requirements

- Table with: id, title, direction, site, theme, budget (column "Budget estimé", raw text as submitted, "Non renseigné" if empty), AI average, final average, status, duplicate badge, shortlist badge.
- **Filters:** direction, site, theme (multi-select; empty values grouped as "Non renseigné"), status, budget range ("Budget min (€)" / "Budget max (€)" on the parsed numeric value; ideas with unknown budget are excluded when a bound is set unless "Inclure budgets non renseignés" is checked), free-text search on title/description. Multi-select dropdowns close on outside click or Escape.
- Sort by any column (budget sorts on the parsed numeric value, unknown budgets last). A "Trier par" control (final average desc/asc, AI average desc/asc, identifier) is synced with column-header sorting; there is no score-range filter.
- The title column is the widest (wrapping, never truncated); other columns stay compact and the table scrolls horizontally inside its container on narrow screens.
- Filters stored in the URL query string (budget: `bmin`, `bmax`, `bnull=1`; sort: `sort`, `dir`).
- Duplicates hidden by default (toggle "afficher les doublons").
- Header actions: "Lancer la notation IA", "Voir la shortlist", "Exporter Excel".
- Progress indicator: X / N ideas reviewed.

## Acceptance

Filtering by direction and sorting by final average is instant on 200 ideas.

## Implementation notes

- Tables/views: `ideas`, `idea_averages`.
- Front: `pages/IdeasPage.tsx`, `components/ideas/*`, `hooks/useIdeas.ts`, `lib/export/ideasXlsx.ts` (Excel export button, see [F7](07-shortlist-export.md)).
