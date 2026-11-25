// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { nowLocal } from '../../shared/dates'
import { ApiError } from '../api'
import { reading } from '../test/fakeApi'
import { TodayCard } from './TodayCard'

const today = nowLocal().slice(0, 10)
const setup = (over: Partial<Parameters<typeof TodayCard>[0]> = {}) => {
  const onAdd = vi.fn(async () => reading({ id: 9, takenAt: nowLocal() }))
  const onUndo = vi.fn(async () => {})
  render(<TodayCard readings={[]} onAdd={onAdd} onUndo={onUndo} {...over} />)
  return { onAdd, onUndo }
}
const box = (n: string) => screen.getByRole('textbox', { name: n })
const fill = async (s = '145', d = '91', p = '70') => {
  await userEvent.type(box('SYS'), s)
  await userEvent.type(box('DIA'), d)
  await userEvent.type(box('PULSE'), p)
}

it('autofocuses SYS and auto-advances', async () => {
  setup()
  expect(box('SYS')).toHaveFocus()
  await userEvent.type(box('SYS'), '145')
  expect(box('DIA')).toHaveFocus()
  await userEvent.type(box('DIA'), '91')
  expect(box('PULSE')).toHaveFocus()
})

it('shows an inline error and disables Save when sys <= dia', async () => {
  setup()
  await fill('90', '95', '70')
  expect(screen.getByText(/higher|greater|above|exceed/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Save reading 1' })).toBeDisabled()
})

it('saves, clears, refocuses SYS and offers undo', async () => {
  const { onAdd, onUndo } = setup()
  await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Save reading 1' }))
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ sys: 145, dia: 91, pulse: 70, note: null }))
  await waitFor(() => expect(box('SYS')).toHaveFocus())
  expect(box('SYS')).toHaveValue('')
  await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
  expect(onUndo).toHaveBeenCalledWith(9)
})

it('keeps values and alerts when save rejects', async () => {
  setup({ onAdd: vi.fn().mockRejectedValue(new ApiError(0, "Can't reach Chill Pill. Check your connection.")) })
  await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Save reading 1' }))
  expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach Chill Pill")
  expect(box('SYS')).toHaveValue('145')
  expect(box('PULSE')).toHaveValue('70')
})

it('shows a server field error on that field', async () => {
  setup({ onAdd: vi.fn().mockRejectedValue(new ApiError(400, 'Too far in the future', 'takenAt')) })
  await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Save reading 1' }))
  expect(await screen.findByText('Too far in the future')).toBeInTheDocument()
})

it('calls onAdd once on a double click', async () => {
  let release!: () => void
  const onAdd = vi.fn(() => new Promise<ReturnType<typeof reading>>((r) => { release = () => r(reading({ id: 9 })) }))
  setup({ onAdd })
  await fill()
  const btn = screen.getByRole('button', { name: 'Save reading 1' })
  await userEvent.dblClick(btn)
  expect(onAdd).toHaveBeenCalledTimes(1)
  release()
})

it('submits with Enter in PULSE', async () => {
  const { onAdd } = setup()
  await fill('145', '91', '70')
  await userEvent.type(box('PULSE'), '{Enter}')
  expect(onAdd).toHaveBeenCalledTimes(1)
})

it('averages today only, rounded, with a count and next-save number', () => {
  setup({
    readings: [
      reading({ id: 1, takenAt: `${today}T08:00`, sys: 145, dia: 91 }),
      reading({ id: 2, takenAt: `${today}T09:00`, sys: 150, dia: 94 }),
      reading({ id: 3, takenAt: '2020-01-01T09:00', sys: 100, dia: 60 }),
    ],
  })
  expect(screen.getByText('Today · avg of 2')).toBeInTheDocument()
  expect(screen.getByLabelText("Today's average")).toHaveTextContent('148/93')
  expect(screen.getByRole('button', { name: 'Save reading 3' })).toBeInTheDocument()
})

it('shows the hint when there is no reading today', () => {
  setup()
  expect(screen.getByText('Your first reading of the day goes here')).toBeInTheDocument()
})

it('reveals the note and sends it', async () => {
  const { onAdd } = setup()
  await userEvent.click(screen.getByRole('button', { name: '+ note' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'Note' }), 'after coffee')
  await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Save reading 1' }))
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ note: 'after coffee' }))
})

it('guards against two synchronous submits', async () => {
  const onAdd = vi.fn(() => new Promise<ReturnType<typeof reading>>(() => {}))
  setup({ onAdd })
  await fill()
  const form = box('SYS').closest('form')!
  fireEvent.submit(form)
  fireEvent.submit(form)
  expect(onAdd).toHaveBeenCalledTimes(1)
})

it('does not flash a range error while typing a normal value', async () => {
  setup()
  await userEvent.type(box('SYS'), '1')
  expect(screen.queryByText(/Enter 60/)).not.toBeInTheDocument()
})

it('selects the content when advancing into a filled field', async () => {
  setup()
  await userEvent.type(box('DIA'), '88')
  await userEvent.type(box('SYS'), '145')
  expect(box('DIA')).toHaveFocus()
  expect((box('DIA') as HTMLInputElement).selectionEnd).toBe(2)
})

it('says so when undo fails', async () => {
  setup({ onUndo: vi.fn().mockRejectedValue(new ApiError(0, 'offline')) })
  await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Save reading 1' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
  expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't undo: offline")
})
