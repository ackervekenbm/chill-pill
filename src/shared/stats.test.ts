// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { describe, expect, it } from 'vitest'
import { beforeAfter, dayAverages, inRange, isOnTarget, periodOf, shouldAdvance, summarize } from './stats'
import { DEFAULT_SETTINGS, type DayAverage, type Reading } from './types'

let n = 0
const r = (takenAt: string, sys: number, dia: number, pulse: number): Reading =>
  ({ id: ++n, takenAt, sys, dia, pulse, note: null, createdAt: takenAt })
const day = (d: string, sys: number, dia: number): DayAverage => ({ day: d, sys, dia, pulse: 70, count: 1, readings: [] })

describe('periodOf', () => {
  it('boundary', () => {
    expect(periodOf('2026-05-01T11:59')).toBe('morning')
    expect(periodOf('2026-05-01T12:00')).toBe('evening')
    expect(periodOf('2026-05-01')).toBe('morning')
  })
})

describe('dayAverages', () => {
  const rs = [r('2026-05-02T08:05', 150, 94, 74), r('2026-04-28', 130, 80, 60), r('2026-05-02T08:00', 140, 90, 70)]
  it('groups, sorts, averages', () => {
    const d = dayAverages(rs)
    expect(d.map((x) => x.day)).toEqual(['2026-04-28', '2026-05-02'])
    expect(d[1]).toMatchObject({ sys: 145, dia: 92, pulse: 72, count: 2 })
    expect(d[1].readings.map((x) => x.takenAt)).toEqual(['2026-05-02T08:00', '2026-05-02T08:05'])
  })
  it('keeps unrounded means', () => {
    expect(dayAverages([r('2026-05-03T08:00', 100, 60, 60), r('2026-05-03T09:00', 101, 60, 60)])[0].sys).toBe(100.5)
  })
  it('period filter', () => {
    const mixed = [...rs, r('2026-05-02T20:00', 120, 70, 60)]
    const ev = dayAverages(mixed, 'evening')
    expect(ev).toHaveLength(1)
    expect(ev[0]).toMatchObject({ day: '2026-05-02', sys: 120, count: 1 })
    expect(dayAverages(mixed, 'morning').map((x) => x.day)).toEqual(['2026-04-28', '2026-05-02'])
  })
  it('empty', () => expect(dayAverages([])).toEqual([]))
})

describe('inRange', () => {
  it('inclusive, null from is open', () => {
    const d = [day('2026-05-01', 1, 1), day('2026-05-02', 1, 1), day('2026-05-03', 1, 1)]
    expect(inRange(d, '2026-05-02', '2026-05-02').map((x) => x.day)).toEqual(['2026-05-02'])
    expect(inRange(d, null, '2026-05-02')).toHaveLength(2)
  })
})

describe('summarize / isOnTarget', () => {
  it('weighs days equally', () => {
    const d = dayAverages([r('2026-05-01T08:00', 150, 90, 70), r('2026-05-02T08:00', 130, 80, 70), r('2026-05-02T09:00', 130, 80, 70), r('2026-05-02T10:00', 130, 80, 70)])
    expect(summarize(d, DEFAULT_SETTINGS)).toEqual({ sys: 140, dia: 85, pulse: 70, days: 2, onTargetShare: 0.5 })
  })
  it('empty is null', () => expect(summarize([], DEFAULT_SETTINGS)).toBeNull())
  it('strictly below targets', () => {
    const t = DEFAULT_SETTINGS
    expect(isOnTarget({ sys: 134, dia: 84 }, t)).toBe(true)
    expect(isOnTarget({ sys: 135, dia: 84 }, t)).toBe(false)
    expect(isOnTarget({ sys: 134, dia: 85 }, t)).toBe(false)
  })
})

describe('beforeAfter', () => {
  it('window boundaries', () => {
    const d = ['2026-05-10', '2026-05-11', '2026-06-09', '2026-06-10', '2026-07-09', '2026-07-10'].map((x) => day(x, 100, 60))
    const b = beforeAfter(d, '2026-06-10')
    expect(b.before?.days).toBe(2)
    expect(b.after?.days).toBe(2)
    expect(b.before).toMatchObject({ sys: 100, dia: 60, pulse: 70 })
  })
  it('empty sides are null', () => {
    expect(beforeAfter([], '2026-06-10')).toEqual({ before: null, after: null })
    expect(beforeAfter([day('2026-06-10', 1, 1)], '2026-06-10').before).toBeNull()
  })
})

describe('shouldAdvance', () => {
  it.each([
    ['sys', '95', true], ['sys', '14', false], ['sys', '27', true], ['sys', '145', true],
    ['dia', '85', true], ['dia', '12', false], ['pulse', '72', true], ['pulse', '18', false],
  ] as const)('%s %s', (f, t, e) => expect(shouldAdvance(f, t)).toBe(e))
})
