// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { expect, it } from 'vitest'
import { shortDate } from './TrendChart'

it('shows day numbers without a leading zero', () => {
  expect(shortDate('2026-11-05')).toBe('5 Nov')
})
