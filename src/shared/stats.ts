// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { addDays } from './dates'
import type { BeforeAfter, DayAverage, Period, Reading, RangeSummary, Settings, WindowAverage } from './types'

export function periodOf(takenAt: string): 'morning' | 'evening' {
  return takenAt.length > 10 && takenAt.slice(11, 16) >= '12:00' ? 'evening' : 'morning'
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

export function dayAverages(readings: Reading[], period: Period = 'all'): DayAverage[] {
  const byDay = new Map<string, Reading[]>()
  for (const r of readings) {
    if (period !== 'all' && periodOf(r.takenAt) !== period) continue
    const day = r.takenAt.slice(0, 10)
    byDay.set(day, [...(byDay.get(day) ?? []), r])
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([day, rs]) => {
      rs.sort((a, b) => (a.takenAt < b.takenAt ? -1 : a.takenAt > b.takenAt ? 1 : a.id - b.id))
      return {
        day,
        sys: mean(rs.map((r) => r.sys)),
        dia: mean(rs.map((r) => r.dia)),
        pulse: mean(rs.map((r) => r.pulse)),
        count: rs.length,
        readings: rs,
      }
    })
}

/** Inclusive on both ends; from === null is open-ended. */
export function inRange(days: DayAverage[], from: string | null, to: string): DayAverage[] {
  return days.filter((d) => (from === null || d.day >= from) && d.day <= to)
}

export function isOnTarget(
  d: Pick<DayAverage, 'sys' | 'dia'>,
  s: Pick<Settings, 'targetSys' | 'targetDia'>,
): boolean {
  return d.sys < s.targetSys && d.dia < s.targetDia
}

function windowAverage(days: DayAverage[]): WindowAverage | null {
  if (days.length === 0) return null
  return {
    sys: mean(days.map((d) => d.sys)),
    dia: mean(days.map((d) => d.dia)),
    pulse: mean(days.map((d) => d.pulse)),
    days: days.length,
  }
}

export function summarize(days: DayAverage[], s: Settings): RangeSummary | null {
  const w = windowAverage(days)
  if (!w) return null
  return { ...w, onTargetShare: days.filter((d) => isOnTarget(d, s)).length / days.length }
}

/** before = [D-30, D-1], after = [D, D+29]. */
export function beforeAfter(days: DayAverage[], date: string): BeforeAfter {
  return {
    before: windowAverage(inRange(days, addDays(date, -30), addDays(date, -1))),
    after: windowAverage(inRange(days, date, addDays(date, 29))),
  }
}

const MAX = { sys: 260, dia: 160, pulse: 220 }

/** Auto-advance once no further digit could keep the value valid. */
export function shouldAdvance(field: 'sys' | 'dia' | 'pulse', text: string): boolean {
  return text.length === 3 || Number(text + '0') > MAX[field]
}
