[← Back to PRD](../PRD.md)

# F2 — Challenge creation by file upload

**Depends on:** [F1](01-authentication.md)

## Requirements

- Challenge list: title, number of ideas, % reviewed, last update.
- "Nouveau challenge" opens a file picker (`.csv`, `.xlsx`). On upload:
  1. the file is parsed client-side (PapaParse for CSV with separator auto-detection and UTF-8 BOM handling, SheetJS for XLSX);
  2. headers are validated against the expected format below; if a required column is missing, a clear French error lists the missing columns and nothing is created;
  3. a challenge is created with `title` = file name without extension (e.g. `idees_hexavia`);
  4. rows are normalized (see "Normalization rules" below) and inserted in one batch; rows without `titre` or `description` are skipped and reported ("2 lignes ignorées : titre ou description manquant");
  5. exact duplicates are flagged ([F6](06-duplicate-detection.md));
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

## Normalization rules

- **Date parsing:** accept `YYYY-MM-DD` and `DD/MM/YYYY`; unparseable → `null`, raw value kept in `submitted_on_raw`.
- **Budget parsing:** keep the raw text in `budget_raw`; derive `budget_eur` (numeric, nullable): strip spaces and `€`/`euros`, `k` → ×1000, ignore trailing comments in parentheses; `?` or empty → `null`; `0` / `0 €` → 0.
- Empty `site` / `theme` / `benefices_attendus` stored as `null`.

## Acceptance

Uploading `idees_hexavia.csv` creates a challenge "idees_hexavia" with 40 ideas in under 10 s, with dates and budgets parsed as described in "Normalization rules".

## Implementation notes

- Tables: `challenges`, `ideas`.
- RPC: `flag_exact_duplicates` called right after the insert ([F6](06-duplicate-detection.md)).
- Front: `pages/ChallengesPage.tsx`, `components/challenges/*`, `hooks/useChallenges.ts`, `lib/import/parseFile.ts`, `lib/import/normalize.ts`.
- Libraries: PapaParse, SheetJS.
