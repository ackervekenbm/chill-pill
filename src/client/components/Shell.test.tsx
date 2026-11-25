// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Shell } from './Shell'

it('phone: four named tabs, the active one is aria-current', async () => {
  const onView = vi.fn()
  render(<Shell view="history" onView={onView}>body</Shell>)
  const nav = screen.getByRole('navigation', { name: 'Main' })
  expect(nav.querySelectorAll('button')).toHaveLength(4)
  for (const name of ['Today', 'History', 'Medication', 'Settings']) {
    expect(screen.getByRole('button', { name })).toBeInTheDocument()
  }
  expect(screen.getByRole('button', { name: 'History' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('button', { name: 'Today' })).not.toHaveAttribute('aria-current')
  await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
  expect(onView).toHaveBeenCalledWith('settings')
})
