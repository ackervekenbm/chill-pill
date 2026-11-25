// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import type { NewReading } from '../shared/types'

const isEmpty = (v: unknown) => v === null || v === undefined || v === ''

// Excel serial days count from 1899-12-30 (UTC); Date cells are already UTC midnight.
const toDay = (v: unknown): string | null => {
  const d = v instanceof Date ? v : typeof v === 'number' ? new Date(Date.UTC(1899, 11, 30) + v * 86400000) : null
  return d && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null
}

export function parseSheet(rows: unknown[][]): { readings: NewReading[]; problems: string[] } {
  const readings: NewReading[] = []
  const problems: string[] = []
  for (const row of rows.slice(1)) {
    const takenAt = toDay(row[0])
    if (!takenAt) continue
    for (let i = 0; i < 3; i++) {
      const triple = row.slice(1 + i * 3, 4 + i * 3)
      while (triple.length < 3) triple.push(null)
      const filled = triple.filter((v) => !isEmpty(v)).length
      if (filled === 0) continue
      const label = `${takenAt} reading ${i + 1}`
      if (filled < 3) problems.push(`${label}: incomplete`)
      else if (!triple.every((v) => typeof v === 'number' && Number.isInteger(v))) problems.push(`${label}: not a whole number`)
      else readings.push({ takenAt, sys: triple[0] as number, dia: triple[1] as number, pulse: triple[2] as number })
    }
  }
  return { readings, problems }
}
