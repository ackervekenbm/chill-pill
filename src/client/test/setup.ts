// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { cloneElement, type ReactElement } from 'react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  try {
    localStorage.clear()
  } catch {
    /* storage unavailable */
  }
  history.replaceState(null, '', '/')
})

// jsdom has no layout, so ResponsiveContainer would measure 0×0 and draw nothing.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number; height?: number }> }) =>
      cloneElement(children, { width: 600, height: 260 }),
  }
})
