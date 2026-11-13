import { useState } from 'react'
import type { IdeaListItem } from '../../lib/ideasList'
import { fetchChallengeScores } from '../../hooks/useChallengeScores'
import { exportChallengeXlsx } from '../../lib/export/ideasXlsx'
import { useToast } from '../ui/useToast'
import Button from '../ui/Button'

interface Props {
  challengeTitle: string
  ideas: IdeaListItem[]
}

export default function ExportButtons({ challengeTitle, ideas }: Props) {
  const toast = useToast()
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | null>(null)
  const hasShortlist = ideas.some((i) => i.shortlisted)

  const run = async (kind: 'pdf' | 'xlsx') => {
    setBusy(kind)
    try {
      const scores = await fetchChallengeScores(ideas.map((i) => i.id))
      if (kind === 'pdf') {
        // Lazy: keeps @react-pdf/renderer out of the main bundle.
        const { downloadShortlistPdf } = await import('../../lib/export/shortlistPdf')
        await downloadShortlistPdf({ title: challengeTitle }, ideas, scores)
      } else {
        exportChallengeXlsx(challengeTitle, ideas, scores)
      }
    } catch (e) {
      toast.show(e instanceof Error && e.message ? e.message : "L'export a échoué.", 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex gap-2">
      <Button type="button" disabled={!hasShortlist || busy !== null} onClick={() => run('pdf')}>
        {busy === 'pdf' ? 'Export…' : 'Exporter PDF'}
      </Button>
      <Button type="button" disabled={busy !== null} onClick={() => run('xlsx')}>
        {busy === 'xlsx' ? 'Export…' : 'Exporter Excel'}
      </Button>
    </div>
  )
}
