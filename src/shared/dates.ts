// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import type { RangeId } from './types'

const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (d: Date) => d.toISOString().slice(0, 10)
const parseDay = (day: string) => new Date(`${day.slice(0, 10)}T00:00:00Z`)

/** Local 'YYYY-MM-DDTHH:MM' in the given time zone. */
export function nowLocal(tz = 'Europe/Brussels', now = new Date()): string {
  const s = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(now)
  return s.replace(' ', 'T')
}

export function addDays(day: string, n: number): string {
  const d = parseDay(day)
  d.setUTCDate(d.getUTCDate() + n)
  return toIso(d)
}

/** True when takenAt is more than toleranceMin after now. Date-only counts as 00:00. */
export function isFuture(takenAt: string, now: string, toleranceMin = 5): boolean {
  const limit = new Date(`${now}:00Z`)
  limit.setUTCMinutes(limit.getUTCMinutes() + toleranceMin)
  const t = takenAt.length === 10 ? `${takenAt}T00:00` : takenAt
  return t > limit.toISOString().slice(0, 16)
}

const MONTHS_BACK: Record<Exclude<RangeId, 'All'>, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }

/** Calendar months back, day clamped to month end. 'All' has no start. */
export function rangeStart(range: RangeId, today: string): string | null {
  if (range === 'All') return null
  const [y, m, d] = today.split('-').map(Number)
  const total = y * 12 + (m - 1) - MONTHS_BACK[range]
  const year = Math.floor(total / 12)
  const month = (total % 12) + 1
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${pad(month)}-${pad(Math.min(d, last))}`
}
