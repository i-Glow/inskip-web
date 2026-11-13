[← Back to PRD](../PRD.md)

# F4 — Idea detail & scoring

**Depends on:** [F3](03-ideas-list.md), [F5](05-ai-scoring-mock.md)

## Requirements

Two-column layout: idea content on the left, scoring panel on the right.

- Left: title, id, submission date, author (first + last name), direction, site, theme, description, expected benefits, "Budget estimé" (raw text as submitted, "Non renseigné" if empty).
- Right, for each of the 4 criteria:
  - AI score (1–5) and AI justification, read-only, labeled "Suggestion IA";
  - final score (1–5 selector) and final justification (textarea), pre-filled from the AI suggestion, editable;
  - visual flag when final score ≠ AI score;
  - short static description of the criterion on hover.
- Average score (computed).
- Buttons: "Valider" (status → `reviewed`), "Ajouter à la shortlist", previous / next idea (respecting the current filters and sort).
- Autosave with ~800 ms debounce and a discreet "enregistré" indicator.

## Acceptance

Camille can edit a score and its justification, validate, and move to the next idea without leaving the page.

## Implementation notes

- Tables/views: `ideas`, `scores`, `idea_averages`.
- Front: `pages/IdeaDetailPage.tsx`, `components/idea/*`, `hooks/useIdea.ts`, `hooks/useScores.ts`, `lib/criteria.ts`, `lib/scoring.ts`.
