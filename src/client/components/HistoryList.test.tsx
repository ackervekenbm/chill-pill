// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { dayAverages } from '../../shared/stats'
import { DEFAULT_SETTINGS } from '../../shared/types'
import { reading } from '../test/fakeApi'
import { HistoryList } from './HistoryList'

const readings = [
  reading({ id: 1, takenAt: '2026-11-20T08:00', sys: 150, dia: 95, note: 'after a walk' }),
  reading({ id: 2, takenAt: '2026-11-20T08:10', sys: 140, dia: 91 }),
  reading({ id: 3, takenAt: '2026-11-18', sys: 120, dia: 78 }),
  reading({ id: 4, takenAt: '2025-12-24T20:00', sys: 130, dia: 80 }),
]
const setup = (rs = readings, onOpen = vi.fn()) => {
  render(<HistoryList days={dayAverages(rs)} settings={DEFAULT_SETTINGS} onOpen={onOpen} />)
  return onOpen
}
const desktop = (on: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: on, media: q, addEventListener() {}, removeEventListener() {} }))
afterEach(() => vi.unstubAllGlobals())

it('lists days newest first with rounded averages, count and date format', () => {
  setup()
  const rows = screen.getAllByRole('button')
  expect(rows).toHaveLength(3)
  expect(rows[0]).toHaveTextContent('Fri 20 Nov')
  expect(rows[0]).toHaveTextContent('145/93')
  expect(rows[0]).toHaveTextContent('2')
  expect(rows[1]).toHaveTextContent('Wed 18 Nov')
  expect(rows[2]).toHaveTextContent('Wed 24 Dec 2025')
})

it('puts a backfilled earlier reading under its own date, in order', () => {
  setup([...readings, reading({ id: 9, takenAt: '2026-11-19T07:00', sys: 133, dia: 82 })])
  const rows = screen.getAllByRole('button').map((b) => b.textContent)
  expect(rows[1]).toContain('Thu 19 Nov')
  expect(rows[0]).toContain('Fri 20 Nov')
  expect(rows[2]).toContain('Wed 18 Nov')
})

it('marks on-target days for screen readers and shows a note icon', () => {
  setup()
  const rows = screen.getAllByRole('button')
  expect(within(rows[0]).queryByText('on target')).toBeNull()
  expect(within(rows[1]).getByText('on target')).toBeInTheDocument()
  expect(within(rows[0]).getByLabelText('has a note')).toBeInTheDocument()
})

it('opens a day on click', async () => {
  const onOpen = setup()
  await userEvent.click(screen.getAllByRole('button')[1])
  expect(onOpen).toHaveBeenCalledWith('2026-11-18')
})

it('says so when there are no readings', () => {
  setup([])
  expect(screen.getByText('No readings yet')).toBeInTheDocument()
})

it('renders a table with headers on desktop', () => {
  desktop(true)
  setup()
  expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Date', 'Avg', 'Pulse', 'Readings', 'Note'])
  expect(screen.getAllByRole('row')).toHaveLength(4)
  expect(screen.getByText('after a walk')).toBeInTheDocument()
})

it('abbreviates September to three letters', () => {
  setup([reading({ id: 5, takenAt: '2026-09-23T08:00' })])
  expect(screen.getByRole('button')).toHaveTextContent('Wed 23 Sep')
  expect(screen.getByRole('button')).not.toHaveTextContent('Sept')
})
