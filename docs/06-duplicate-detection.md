[← Back to PRD](../PRD.md)

# F6 — Duplicate detection (exact match)

**Depends on:** [F2](02-challenge-upload.md)

## Requirements

- At import, each idea gets a `content_key`: title + description, lowercased, trimmed, with whitespace collapsed (generated column, see [architecture §2](../architecture.md#2-data-model)).
- Ideas of the same challenge sharing a `content_key` form a group; the earliest one (by submission date, then id) is the original, the others get `duplicate_of = original.id` and status `duplicate`.
- In the Hexavia file this catches IDEA-002 / IDEA-014 (same author, resubmitted).
- Duplicates show a badge linking to the original; the original shows "1 doublon".
- "Ce n'est pas un doublon" on a duplicate removes the flag (`duplicate_of = null`, status back to `new` or `ai_scored`).
- Duplicates are excluded from bulk scoring and cannot be shortlisted.

**Known limitation:** similar ideas worded differently are not detected (e.g. in the Hexavia file, IDEA-001 / IDEA-007 on compressor sensors, IDEA-003 / IDEA-019 on an HR chatbot). Camille identifies those manually; fuzzy detection is a V2 item.

## Acceptance

Importing the Hexavia file flags exactly one duplicate.

## Implementation notes

- Columns: `ideas.content_key` (generated), `ideas.duplicate_of`, `ideas.status`.
- RPC: `flag_exact_duplicates(p_challenge_id uuid)`.
- Front: `components/ideas/DuplicateBadge.tsx`, toggle in `components/ideas/IdeaFilters.tsx`.
