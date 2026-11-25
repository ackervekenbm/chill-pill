// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { dayAverages } from '../../shared/stats'
import { ApiError } from '../api'
import { reading } from '../test/fakeApi'
import { DayDetail } from './DayDetail'
import { HistoryPanel } from './HistoryPanel'
import { useData } from '../useData'
import { fakeApi } from '../test/fakeApi'
import { DEFAULT_SETTINGS } from '../../shared/types'

const rs = [
  reading({ id: 1, takenAt: '2026-11-20T08:00', sys: 150, dia: 95, pulse: 70, note: 'after a walk' }),
  reading({ id: 2, takenAt: '2026-11-20T19:30', sys: 140, dia: 91, pulse: 72 }),
  reading({ id: 3, takenAt: '2026-11-18', sys: 120, dia: 78, pulse: 60 }),
]
const day = (day: string) => dayAverages(rs).find((d) => d.day === day)!
const setup = (d = day('2026-11-20'), over: Partial<Parameters<typeof DayDetail>[0]> = {}) => {
  const p = { onEdit: vi.fn(async (id: number) => reading({ id })), onDelete: vi.fn(), onClose: vi.fn() }
  render(<DayDetail day={d} {...p} {...over} />)
  return p
}
const box = (n: string) => screen.getByRole('textbox', { name: n })

it('lists the day readings with times, note, and a dash for date-only', () => {
  setup()
  expect(screen.getByText('08:00')).toBeInTheDocument()
  expect(screen.getByText('19:30')).toBeInTheDocument()
  expect(screen.getByText('after a walk')).toBeInTheDocument()
})
it('shows a dash instead of a time for a date-only reading', () => {
  setup(day('2026-11-18'))
  expect(screen.getByText('—')).toBeInTheDocument()
})
it('goes back', async () => {
  const p = setup()
  await userEvent.click(screen.getByRole('button', { name: /back/i }))
  expect(p.onClose).toHaveBeenCalled()
})
it('edits values and saves a patch', async () => {
  const p = setup()
  await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
  await userEvent.clear(box('SYS'))
  await userEvent.type(box('SYS'), '138')
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(p.onEdit).toHaveBeenCalledWith(1, expect.objectContaining({ sys: 138, dia: 95, pulse: 70, takenAt: '2026-11-20T08:00', note: 'after a walk' }))
})
it('keeps a date-only reading date-only when saved without a time', async () => {
  const p = setup(day('2026-11-18'))
  await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
  await userEvent.clear(box('PULSE'))
  await userEvent.type(box('PULSE'), '64')
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(p.onEdit).toHaveBeenCalledWith(3, expect.objectContaining({ takenAt: '2026-11-18', pulse: 64 }))
})
it('keeps typed values and alerts when the save fails', async () => {
  setup(day('2026-11-20'), { onEdit: vi.fn().mockRejectedValue(new ApiError(0, "Can't reach Chill Pill.")) })
  await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
  await userEvent.clear(box('SYS'))
  await userEvent.type(box('SYS'), '138')
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach")
  expect(box('SYS')).toHaveValue('138')
})
it('blocks Save on an invalid value', async () => {
  setup()
  await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
  await userEvent.clear(box('DIA'))
  await userEvent.type(box('DIA'), '160')
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
})
it('cancel leaves the reading alone', async () => {
  const p = setup()
  await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(p.onEdit).not.toHaveBeenCalled()
  expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2)
})

function Harness() {
  const d = useData()
  return d.loading ? null : (
    <HistoryPanel readings={d.readings} settings={DEFAULT_SETTINGS} onAdd={d.addReading} onUpdate={d.updateReading} onRemove={d.removeReading} />
  )
}

it('moves a reading to another day when its date is edited, dropping the emptied day', async () => {
  fakeApi({ readings: rs })
  render(<Harness />)
  await userEvent.click(await screen.findByRole('button', { name: /Wed 18 Nov/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
  const date = screen.getByLabelText('Date')
  await userEvent.clear(date)
  await userEvent.type(date, '2026-11-19')
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  // the old day is now empty, so the panel falls back to the list
  const list = await screen.findAllByRole('button', { name: /Nov/ })
  expect(list.map((b) => b.textContent)).toEqual([expect.stringContaining('Fri 20 Nov'), expect.stringContaining('Thu 19 Nov')])
})

it('deletes immediately with Undo that re-adds the same reading', async () => {
  const api = fakeApi({ readings: rs })
  render(<Harness />)
  await userEvent.click(await screen.findByRole('button', { name: /Wed 18 Nov/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
  expect(api.calls.some((c) => c.method === 'DELETE' && c.path === '/api/readings/3')).toBe(true)
  await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
  await waitFor(() => expect(api.calls.some((c) => c.method === 'POST' && (c.body as { takenAt: string }).takenAt === '2026-11-18')).toBe(true))
  const post = api.calls.find((c) => c.method === 'POST')!
  expect(post.body).toEqual({ takenAt: '2026-11-18', sys: 120, dia: 78, pulse: 60, note: null })
  expect(within(document.body).queryByRole('button', { name: 'Undo' })).toBeNull()
})
