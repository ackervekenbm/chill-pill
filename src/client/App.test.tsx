// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { App } from './App'

it('renders the app name', () => {
  render(<App />)
  expect(screen.getByText('Chill Pill')).toBeInTheDocument()
})
