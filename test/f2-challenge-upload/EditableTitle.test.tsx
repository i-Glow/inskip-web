import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditableTitle from '../../src/components/challenges/EditableTitle'

async function startEditing() {
  await userEvent.click(screen.getByRole('button', { name: /Modifier le titre/ }))
  return screen.getByLabelText('Titre du challenge')
}

describe('EditableTitle', () => {
  it('saves a trimmed title on Enter', async () => {
    const onSave = vi.fn()
    render(<EditableTitle value="Ancien" onSave={onSave} />)
    const input = await startEditing()
    await userEvent.clear(input)
    await userEvent.type(input, '  Nouveau {Enter}')
    expect(onSave).toHaveBeenCalledExactlyOnceWith('Nouveau')
  })

  it('cancels on Escape', async () => {
    const onSave = vi.fn()
    render(<EditableTitle value="Ancien" onSave={onSave} />)
    const input = await startEditing()
    await userEvent.type(input, 'xyz{Escape}')
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Titre du challenge')).not.toBeInTheDocument()
    expect(screen.getByText('Ancien')).toBeInTheDocument()
  })

  it('rejects an empty title', async () => {
    const onSave = vi.fn()
    render(<EditableTitle value="Ancien" onSave={onSave} />)
    const input = await startEditing()
    await userEvent.clear(input)
    await userEvent.type(input, '   {Enter}')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('does not save an unchanged title', async () => {
    const onSave = vi.fn()
    render(<EditableTitle value="Ancien" onSave={onSave} />)
    await startEditing()
    await userEvent.keyboard('{Enter}')
    expect(onSave).not.toHaveBeenCalled()
  })
})
