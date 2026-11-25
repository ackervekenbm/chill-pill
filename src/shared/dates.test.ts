// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { describe, expect, it } from 'vitest'
import { addDays, isFuture, nowLocal, rangeStart } from './dates'

describe('dates', () => {
  it('rangeStart', () => {
    expect(rangeStart('3M', '2026-11-25')).toBe('2026-08-25')
    expect(rangeStart('All', '2026-11-25')).toBeNull()
    expect(rangeStart('1M', '2026-03-31')).toBe('2026-02-28')
    expect(rangeStart('1Y', '2024-02-29')).toBe('2023-02-28')
    expect(rangeStart('6M', '2026-01-15')).toBe('2025-07-15')
  })
  it('addDays crosses months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('isFuture tolerance', () => {
    expect(isFuture('2026-05-01T10:06', '2026-05-01T10:00')).toBe(true)
    expect(isFuture('2026-05-01T10:05', '2026-05-01T10:00')).toBe(false)
    expect(isFuture('2026-05-02', '2026-05-01T10:00')).toBe(true)
    expect(isFuture('2026-05-01', '2026-05-01T10:00')).toBe(false)
  })
  it('nowLocal formats in tz', () => {
    expect(nowLocal('Europe/Brussels', new Date('2026-07-01T10:30:00Z'))).toBe('2026-07-01T12:30')
    expect(nowLocal('Europe/Brussels', new Date('2026-01-01T23:30:00Z'))).toBe('2026-01-02T00:30')
  })
})
