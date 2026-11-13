import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../helpers/render'
import { makeIdea } from '../f3-ideas-list/helpers'

const downloadPdf = vi.fn()
const exportXlsx = vi.fn()
vi.mock('../../src/lib/export/shortlistPdf', () => ({ downloadShortlistPdf: (...a: unknown[]) => downloadPdf(...a) }))
vi.mock('../../src/lib/export/ideasXlsx', () => ({ exportChallengeXlsx: (...a: unknown[]) => exportXlsx(...a) }))
vi.mock('../../src/hooks/useChallengeScores', () => ({ fetchChallengeScores: vi.fn(async () => [{ idea_id: 'x' }]) }))

import ExportButtons from '../../src/components/shortlist/ExportButtons'

beforeEach(() => {
  downloadPdf.mockReset().mockResolvedValue(undefined)
  exportXlsx.mockReset()
})

describe('ExportButtons', () => {
  it('disables PDF when the shortlist is empty but keeps Excel', () => {
    renderWithProviders(<ExportButtons challengeTitle="Défi" ideas={[makeIdea()]} />)
    expect(screen.getByRole('button', { name: 'Exporter PDF' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Exporter Excel' })).toBeEnabled()
  })

  it('exports the PDF with fetched scores', async () => {
    const ideas = [makeIdea({ shortlisted: true, shortlist_rank: 1 })]
    renderWithProviders(<ExportButtons challengeTitle="Défi" ideas={ideas} />)
    fireEvent.click(screen.getByRole('button', { name: 'Exporter PDF' }))
    await waitFor(() => expect(downloadPdf).toHaveBeenCalledWith({ title: 'Défi' }, ideas, [{ idea_id: 'x' }]))
  })

  it('exports Excel', async () => {
    const ideas = [makeIdea()]
    renderWithProviders(<ExportButtons challengeTitle="Défi" ideas={ideas} />)
    fireEvent.click(screen.getByRole('button', { name: 'Exporter Excel' }))
    await waitFor(() => expect(exportXlsx).toHaveBeenCalledWith('Défi', ideas, [{ idea_id: 'x' }]))
  })

  it('shows an error toast on failure and re-enables', async () => {
    downloadPdf.mockRejectedValue(new Error('boom'))
    renderWithProviders(
      <ExportButtons challengeTitle="Défi" ideas={[makeIdea({ shortlisted: true, shortlist_rank: 1 })]} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Exporter PDF' }))
    expect(await screen.findByText('boom')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Exporter PDF' })).toBeEnabled())
  })
})
