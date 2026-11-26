// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { App } from './App'
import { fakeApi } from './test/fakeApi'

it('shows the shell already in the saved theme', async () => {
  fakeApi({ settings: { theme: 'dashboard', targetSys: 135, targetDia: 85 } })
  // Read the theme the instant the nav lands in the DOM: an effect that runs later (after paint) would still show 'calm' here.
  const themeWhenShown = await new Promise<string | undefined>((resolve) => {
    const mo = new MutationObserver(() => {
      if (!document.querySelector('nav[aria-label="Main"]')) return
      mo.disconnect()
      resolve(document.documentElement.dataset.theme)
    })
    mo.observe(document.body, { childList: true, subtree: true })
    render(<App />)
  })
  expect(themeWhenShown).toBe('dashboard')
  expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
})

it('offers a retry when loading fails', async () => {
  const api = fakeApi()
  api.failNext(3)
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument()
})
