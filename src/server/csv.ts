// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import type { Medication, Reading } from '../shared/types'

const cell = (v: string | number | null): string => {
  const s = v === null ? '' : String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** One file: readings then medications, RFC 4180 (CRLF line ends). Date-only readings have an empty time. */
export function toCsv(readings: Reading[], meds: Medication[]): string {
  const rows: (string | number | null)[][] = [['type', 'date', 'time', 'sys', 'dia', 'pulse', 'note_or_label']]
  for (const r of readings) rows.push(['reading', r.takenAt.slice(0, 10), r.takenAt.slice(11), r.sys, r.dia, r.pulse, r.note])
  for (const m of meds) rows.push(['medication', m.date, '', null, null, null, m.label])
  return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}
