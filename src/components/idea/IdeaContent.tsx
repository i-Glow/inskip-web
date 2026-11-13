import type { Tables } from '../../lib/database.types'

function formatDate(idea: Tables<'ideas'>): string {
  if (idea.submitted_on) {
    const d = new Date(idea.submitted_on)
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(d)
    }
  }
  return idea.submitted_on_raw || '—'
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm whitespace-pre-line text-gray-900">{children || '—'}</dd>
    </div>
  )
}

export default function IdeaContent({ idea }: { idea: Tables<'ideas'> }) {
  const author = [idea.author_first_name, idea.author_last_name].filter(Boolean).join(' ')
  return (
    <article className="space-y-4">
      <header>
        <p className="text-sm text-gray-500">{idea.external_id}</p>
        <h1 className="text-xl font-semibold">{idea.title}</h1>
      </header>
      <dl className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date de soumission">{formatDate(idea)}</Field>
          <Field label="Auteur">{author}</Field>
          <Field label="Direction">{idea.direction}</Field>
          <Field label="Site">{idea.site}</Field>
          <Field label="Thème">{idea.theme}</Field>
          <Field label="Budget">{idea.budget_raw}</Field>
        </div>
        <Field label="Description">{idea.description}</Field>
        <Field label="Bénéfices attendus">{idea.expected_benefits}</Field>
      </dl>
    </article>
  )
}
