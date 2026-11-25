// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { dayAverages } from '../../shared/stats'
import { medication, reading } from '../test/fakeApi'
import { BeforeAfterCard } from './BeforeAfterCard'

const med = medication({ date: '2026-11-10', label: 'Started Examplol 5 mg' })

it('shows both averages, the difference and the day counts', async () => {
  const days = dayAverages([
    reading({ id: 1, takenAt: '2026-11-01T08:00', sys: 150, dia: 96 }),
    reading({ id: 2, takenAt: '2026-11-05T08:00', sys: 152, dia: 94 }),
    reading({ id: 3, takenAt: '2026-11-12T08:00', sys: 141, dia: 89 }),
  ])
  const onClose = vi.fn()
  render(<BeforeAfterCard medication={med} days={days} onClose={onClose} />)
  expect(screen.getByText('151/95')).toBeInTheDocument()
  expect(screen.getByText('141/89')).toBeInTheDocument()
  expect(screen.getByText('−10/−6')).toBeInTheDocument()
  expect(screen.getByText('2 days')).toBeInTheDocument()
  expect(screen.getByText('1 day')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(onClose).toHaveBeenCalled()
})

it('shows "no data" for an empty side and no difference', () => {
  const days = dayAverages([reading({ id: 1, takenAt: '2026-11-12T08:00', sys: 141, dia: 89 })])
  const { container } = render(<BeforeAfterCard medication={med} days={days} onClose={() => {}} />)
  expect(screen.getByText('no data')).toBeInTheDocument()
  expect(container.textContent).not.toMatch(/NaN|undefined/)
})
