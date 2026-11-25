// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../../shared/types'
import { medication, reading } from '../test/fakeApi'
import { ReportPage } from './ReportPage'

// Made up: morning 150/95, evening 130/75 on one day; a date-only morning day; one old day outside 3M.
const readings = [
  reading({ id: 1, takenAt: '2026-10-01T08:00', sys: 150, dia: 95, pulse: 70, note: 'after coffee' }),
  reading({ id: 2, takenAt: '2026-10-01T20:30', sys: 130, dia: 75, pulse: 64 }),
  reading({ id: 3, takenAt: '2026-10-02', sys: 120, dia: 80, pulse: 60 }),
  reading({ id: 4, takenAt: '2026-05-01T08:00', sys: 170, dia: 100, pulse: 80 }),
]
const meds = [medication({ date: '2026-10-02', label: 'Started Examplol 5 mg' })]
const setup = (initialRange?: '1M' | '3M' | 'All') =>
  render(<ReportPage readings={readings} medications={meds} settings={DEFAULT_SETTINGS} today="2026-11-25" initialRange={initialRange} />)

afterEach(() => vi.restoreAllMocks())

it('titles the report with period, target and defaults to 3M', () => {
  setup()
  expect(screen.getByRole('heading', { level: 1, name: 'Chill Pill — blood pressure report' })).toBeInTheDocument()
  expect(screen.getByText('25 Aug 2026 – 25 Nov 2026')).toBeInTheDocument()
  expect(screen.getByText(/Generated .* Target 135\/85 mmHg/)).toBeInTheDocument()
})

it('lists every day in range with readings, notes and day average, oldest first', () => {
  setup()
  const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
  expect(rows).toHaveLength(2)
  expect(rows[0]).toHaveTextContent('1 Oct 2026')
  expect(rows[0]).toHaveTextContent('08:00 150/95 70')
  expect(rows[0]).toHaveTextContent('20:30 130/75 64')
  expect(rows[0]).toHaveTextContent('after coffee')
  expect(rows[0]).toHaveTextContent('140/85')
  expect(rows[1]).toHaveTextContent('— 120/80 60')
  expect(screen.queryByText(/1 May 2026/)).not.toBeInTheDocument()
})

it('shows morning, evening and overall averages', () => {
  setup()
  const s = screen.getByRole('region', { name: 'Summary' })
  // morning days 150/95 and 120/80 → 135/88 (87.5); evening day 130/75; all days 140/85 and 120/80 → 130/83 (82.5)
  expect(within(s).getByText('Morning').nextSibling).toHaveTextContent('135/88')
  expect(within(s).getByText('Evening').nextSibling).toHaveTextContent('130/75')
  expect(within(s).getByText('Overall').nextSibling).toHaveTextContent('130/83')
  expect(s).toHaveTextContent('2 days')
  expect(s).toHaveTextContent('50%')
})

it('shows before/after for medication events in the period', () => {
  setup()
  const m = screen.getByRole('region', { name: 'Medication' })
  expect(m).toHaveTextContent('Started Examplol 5 mg')
  expect(m).toHaveTextContent('Before')
  expect(m).toHaveTextContent('140/85')
  expect(m).toHaveTextContent('After')
})

it('print button calls window.print', async () => {
  const print = vi.spyOn(window, 'print').mockImplementation(() => {})
  setup()
  await userEvent.click(screen.getByRole('button', { name: 'Print / save as PDF' }))
  expect(print).toHaveBeenCalledOnce()
})

it('empty period says so, with no NaN', () => {
  setup('1M')
  expect(screen.getByText('No readings in this period')).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/NaN/)
})

it('custom dates win over the preset; From after To shows an error', async () => {
  setup()
  await userEvent.type(screen.getByLabelText('From'), '2026-05-01')
  await userEvent.type(screen.getByLabelText('To'), '2026-05-31')
  expect(screen.getByText('1 May 2026 – 31 May 2026')).toBeInTheDocument()
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2)
  await userEvent.clear(screen.getByLabelText('To'))
  await userEvent.type(screen.getByLabelText('To'), '2026-04-01')
  expect(screen.getByRole('alert')).toHaveTextContent('From must be on or before To')
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})
