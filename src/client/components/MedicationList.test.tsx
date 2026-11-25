// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MedicationList } from './MedicationList'
import { medication } from '../test/fakeApi'

const meds = [
  medication({ id: 1, date: '2026-09-01', label: 'Started Examplol 5 mg' }),
  medication({ id: 2, date: '2026-10-15', label: 'Raised to 10 mg' }),
]
const setup = () => {
  const onAdd = vi.fn().mockResolvedValue(undefined)
  const onUpdate = vi.fn().mockResolvedValue(undefined)
  const onDelete = vi.fn().mockResolvedValue(undefined)
  render(<MedicationList medications={meds} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />)
  return { onAdd, onUpdate, onDelete }
}

describe('MedicationList', () => {
  it('lists newest first', () => {
    setup()
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Raised to 10 mg')
    expect(items[0]).toHaveTextContent(/Thu 15 Oct/ )
  })

  it('blocks an empty label', async () => {
    const { onAdd } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/label/i)
  })

  it('adds with a trimmed label and clears the field', async () => {
    const { onAdd } = setup()
    await userEvent.type(screen.getByLabelText('Label'), '  Started X 5 mg ')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onAdd).toHaveBeenCalledWith({ date: expect.stringMatching(/^\d{4}-\d\d-\d\d$/), label: 'Started X 5 mg' })
    await waitFor(() => expect(screen.getByLabelText('Label')).toHaveValue(''))
  })

  it('keeps the typed label and shows the error when adding fails', async () => {
    const { onAdd } = setup()
    onAdd.mockRejectedValue(new Error('offline'))
    await userEvent.type(screen.getByLabelText('Label'), 'Stopped')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('offline')
    expect(screen.getByLabelText('Label')).toHaveValue('Stopped')
  })

  it('edits inline: Enter saves, Escape cancels', async () => {
    const { onUpdate } = setup()
    await userEvent.click(screen.getAllByRole('button', { name: /^Edit/ })[0])
    const box = screen.getByLabelText('Edit label')
    await userEvent.clear(box)
    await userEvent.type(box, 'Raised to 20 mg{Enter}')
    expect(onUpdate).toHaveBeenCalledWith(2, { date: '2026-10-15', label: 'Raised to 20 mg' })
    await waitFor(() => expect(screen.queryByLabelText('Edit label')).toBeNull())
    await userEvent.click(screen.getAllByRole('button', { name: /^Edit/ })[0])
    await userEvent.type(screen.getByLabelText('Edit label'), 'zzz{Escape}')
    expect(screen.queryByLabelText('Edit label')).toBeNull()
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('deletes at once and Undo re-adds the same date and label', async () => {
    const { onDelete, onAdd } = setup()
    await userEvent.click(screen.getAllByRole('button', { name: /^Delete/ })[0])
    expect(onDelete).toHaveBeenCalledWith(2)
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    expect(onAdd).toHaveBeenCalledWith({ date: '2026-10-15', label: 'Raised to 10 mg' })
  })
})
