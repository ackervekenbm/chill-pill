// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { App } from './App'
import { fakeApi } from './test/fakeApi'

it('loads, applies the saved theme and shows the shell', async () => {
  fakeApi({ settings: { theme: 'dashboard', targetSys: 135, targetDia: 85 } })
  render(<App />)
  expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  expect(document.documentElement.dataset.theme).toBe('dashboard')
})

it('offers a retry when loading fails', async () => {
  const api = fakeApi()
  api.failNext(3)
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument()
})
