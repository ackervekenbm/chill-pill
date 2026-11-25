// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../../shared/types'
import { medication, reading } from '../test/fakeApi'
import { TrendCard } from './TrendCard'

const today = '2026-11-25'
// Made up: two morning days and one evening-only day inside 6M.
const readings = [
  reading({ id: 1, takenAt: '2026-10-01T08:00', sys: 150, dia: 95, pulse: 70 }),
  reading({ id: 2, takenAt: '2026-10-01T08:10', sys: 140, dia: 91, pulse: 72 }),
  reading({ id: 3, takenAt: '2026-10-02', sys: 130, dia: 80, pulse: 66 }),
  reading({ id: 4, takenAt: '2026-10-03T20:00', sys: 160, dia: 100, pulse: 80 }),
]
const setup = (rs = readings, meds = [medication({ date: '2026-10-02', label: 'Started Examplol 5 mg' })]) =>
  render(<TrendCard readings={rs} medications={meds} settings={DEFAULT_SETTINGS} today={today} />)
const group = (name: string) => within(screen.getByRole('radiogroup', { name }))

it('defaults to 6M and all periods', () => {
  setup()
  expect(group('Range').getByRole('radio', { name: '6M' })).toBeChecked()
  expect(group('Period').getByRole('radio', { name: 'All' })).toBeChecked()
  expect(screen.getByRole('switch', { name: 'Pulse' })).not.toBeChecked()
})

it('summarises the selected range', () => {
  setup()
  // days: 145/93 (off), 130/80 (on), 160/100 (off) → 145/91, 1 of 3 on target
  expect(screen.getByText('6M · 145/91 avg · 33% of days on target · 3 days measured')).toBeInTheDocument()
})

it('Morning excludes evening-only days', async () => {
  setup()
  await userEvent.click(group('Period').getByRole('radio', { name: 'Morning' }))
  expect(screen.getByText('6M · 138/87 avg · 50% of days on target · 2 days measured')).toBeInTheDocument()
})

it('shows an empty state for a range without readings, never NaN', async () => {
  const { container } = setup()
  await userEvent.click(group('Range').getByRole('radio', { name: '1M' }))
  expect(screen.getByText('No readings in this range')).toBeInTheDocument()
  expect(container.textContent).not.toMatch(/NaN|undefined/)
})

it('opens the before/after card from a medication chip and closes it', async () => {
  setup()
  await userEvent.click(screen.getByRole('button', { name: /Started Examplol 5 mg/ }))
  const card = screen.getByRole('region', { name: /Before and after/ })
  expect(within(card).getByText('1 day')).toBeInTheDocument()
  expect(within(card).getByText('2 days')).toBeInTheDocument()
  await userEvent.click(within(card).getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('region', { name: /Before and after/ })).not.toBeInTheDocument()
})

it('does not list medications outside the range', () => {
  setup(readings, [medication({ date: '2025-01-01', label: 'Old change' })])
  expect(screen.queryByRole('button', { name: /Old change/ })).not.toBeInTheDocument()
})
