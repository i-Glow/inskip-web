/** Row shape inserted into the `ideas` table by the file import (before challenge_id). */
export interface NewIdeaRow {
  external_id: string
  submitted_on: string | null
  submitted_on_raw: string | null
  author_first_name: string | null
  author_last_name: string | null
  direction: string | null
  site: string | null
  theme: string | null
  title: string
  description: string
  expected_benefits: string | null
  budget_raw: string | null
  budget_eur: number | null
}
