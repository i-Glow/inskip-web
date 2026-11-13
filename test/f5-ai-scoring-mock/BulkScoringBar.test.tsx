import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BulkScoringBar from '../../src/components/ideas/BulkScoringBar'
import type { BulkProgress } from '../../src/hooks/useAiScoring'

const base: BulkProgress = { running: false, done: 0, total: 0, failed: [], finished: false }
const noop = () => {}

describe('BulkScoringBar', () => {
  it('renders nothing when idle', () => {
    const { container } = render(
      <BulkScoringBar progress={base} onRetry={noop} onRetryAll={noop} onCancel={noop} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows progress and cancel', async () => {
    const onCancel = vi.fn()
    render(
      <BulkScoringBar
        progress={{ ...base, running: true, done: 12, total: 38 }}
        onRetry={noop}
        onRetryAll={noop}
        onCancel={onCancel}
      />,
    )
    expect(screen.getByText('Notation IA : 12 / 38')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12')
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows the done message', () => {
    render(
      <BulkScoringBar
        progress={{ ...base, finished: true, done: 3, total: 3 }}
        onRetry={noop}
        onRetryAll={noop}
        onCancel={noop}
      />,
    )
    expect(screen.getByText(/Notation IA terminée : 3 idées notées/)).toBeInTheDocument()
  })

  it('lists failures with retry buttons', async () => {
    const onRetry = vi.fn()
    const onRetryAll = vi.fn()
    render(
      <BulkScoringBar
        progress={{
          ...base,
          finished: true,
          total: 2,
          done: 2,
          failed: [
            { id: 'i1', external_id: 'ID-1', error: 'Idée introuvable.' },
            { id: 'i2', external_id: 'ID-2', error: 'La notation IA a échoué.' },
          ],
        }}
        onRetry={onRetry}
        onRetryAll={onRetryAll}
        onCancel={noop}
      />,
    )
    expect(screen.getByText(/ID-1 : Idée introuvable\./)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer ID-2' }))
    expect(onRetry).toHaveBeenCalledWith('i2')
    await userEvent.click(screen.getByRole('button', { name: 'Tout réessayer' }))
    expect(onRetryAll).toHaveBeenCalled()
  })
})
