// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { describe, expect, it } from 'vitest'
import { parseSheet } from './importSheet'

const header = ['Date']
const full = (d: unknown) => [d, 150, 90, 80, 148, 88, 78, 146, 86, 76, 148, 88, 78]

describe('parseSheet', () => {
  it('turns an Excel serial row into three readings', () => {
    const { readings, problems } = parseSheet([header, full(46027)])
    expect(problems).toEqual([])
    expect(readings).toEqual([
      { takenAt: '2026-01-05', sys: 150, dia: 90, pulse: 80 },
      { takenAt: '2026-01-05', sys: 148, dia: 88, pulse: 78 },
      { takenAt: '2026-01-05', sys: 146, dia: 86, pulse: 76 },
    ])
  })
  it('accepts a Date cell', () => {
    const { readings } = parseSheet([header, full(new Date('2026-01-05T00:00:00Z'))])
    expect(readings.map((r) => r.takenAt)).toEqual(['2026-01-05', '2026-01-05', '2026-01-05'])
  })
  it('skips empty and date-only rows silently', () => {
    expect(parseSheet([header, [], [46027], [46028, null, '', null, null, null, null]])).toEqual({
      readings: [],
      problems: [],
    })
  })
  it('reports an incomplete triple and keeps the others', () => {
    const row = full(46086)
    row[5] = null
    const { readings, problems } = parseSheet([header, row])
    expect(readings).toHaveLength(2)
    expect(problems).toEqual(['2026-03-05 reading 2: incomplete'])
  })
  it('reports non-integer values', () => {
    const row = full(46086)
    row[1] = 155.5
    const { readings, problems } = parseSheet([header, row])
    expect(readings).toHaveLength(2)
    expect(problems).toEqual(['2026-03-05 reading 1: not a whole number'])
  })
  it('reports values without a valid date', () => {
    const { readings, problems } = parseSheet([header, full('3 maart'), full(null)])
    expect(readings).toEqual([])
    expect(problems).toEqual(['row 2: values but no valid date (got "3 maart")', 'row 3: values but no valid date (got "")'])
  })
})
