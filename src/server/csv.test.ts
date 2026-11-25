// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('writes header, rows, empty time for date-only, and quotes commas and quotes', () => {
    const out = toCsv(
      [
        { id: 1, takenAt: '2026-01-02T08:30', sys: 120, dia: 80, pulse: 60, note: 'a, "b"', createdAt: '' },
        { id: 2, takenAt: '2026-01-03', sys: 130, dia: 85, pulse: 70, note: null, createdAt: '' },
      ],
      [{ id: 1, date: '2026-01-01', label: 'Start', createdAt: '' }],
    )
    expect(out.split('\r\n')).toEqual([
      'type,date,time,sys,dia,pulse,note_or_label',
      'reading,2026-01-02,08:30,120,80,60,"a, ""b"""',
      'reading,2026-01-03,,130,85,70,',
      'medication,2026-01-01,,,,,Start',
      '',
    ])
  })
})
