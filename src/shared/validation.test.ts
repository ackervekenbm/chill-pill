// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { describe, expect, it } from 'vitest'
import { newReadingSchema, fieldError, readingPatchSchema, newMedicationSchema, settingsSchema, importSchema } from './validation'

const ok = { takenAt: '2026-05-01T08:00', sys: 140, dia: 90, pulse: 70 }

describe('newReadingSchema', () => {
  it('accepts valid readings, date-only and date-time', () => {
    expect(newReadingSchema.safeParse(ok).success).toBe(true)
    expect(newReadingSchema.safeParse({ ...ok, takenAt: '2026-05-01' }).success).toBe(true)
  })
  it.each([
    [{ sys: 261 }], [{ dia: 29 }], [{ pulse: 221 }], [{ sys: 90, dia: 90 }], [{ sys: 12.5 }],
    [{ note: 'x'.repeat(281) }], [{ takenAt: '2026-13-01' }],
  ])('rejects %j', (patch) => {
    expect(newReadingSchema.safeParse({ ...ok, ...patch }).success).toBe(false)
  })
  it('reports sys<=dia on the dia path', () => {
    const r = newReadingSchema.safeParse({ ...ok, sys: 90, dia: 90 })
    expect(r.success ? null : r.error.issues[0].path).toEqual(['dia'])
  })
  it('trims note, blank becomes null', () => {
    expect(newReadingSchema.parse({ ...ok, note: '  hi ' }).note).toBe('hi')
    expect(newReadingSchema.parse({ ...ok, note: '  ' }).note).toBeNull()
  })
})

describe('other schemas', () => {
  it('patch allows partial, still range checks', () => {
    expect(readingPatchSchema.safeParse({ pulse: 80 }).success).toBe(true)
    expect(readingPatchSchema.safeParse({ pulse: 10 }).success).toBe(false)
  })
  it('medication label trimmed 1-120', () => {
    expect(newMedicationSchema.parse({ date: '2026-05-01', label: ' X 5 mg ' }).label).toBe('X 5 mg')
    expect(newMedicationSchema.safeParse({ date: '2026-05-01', label: '  ' }).success).toBe(false)
    expect(newMedicationSchema.safeParse({ date: '2026-05-01', label: 'x'.repeat(121) }).success).toBe(false)
  })
  it('settings', () => {
    expect(settingsSchema.safeParse({ theme: 'calm', targetSys: 135, targetDia: 85 }).success).toBe(true)
    expect(settingsSchema.safeParse({ theme: 'nope', targetSys: 135, targetDia: 85 }).success).toBe(false)
  })
  it('import caps at 5000', () => {
    expect(importSchema.safeParse(Array(5000).fill(ok)).success).toBe(true)
    expect(importSchema.safeParse(Array(5001).fill(ok)).success).toBe(false)
  })
})

describe('fieldError', () => {
  it('null for empty or valid', () => {
    expect(fieldError('sys', '')).toBeNull()
    expect(fieldError('sys', '120')).toBeNull()
  })
  it('message for non-numeric and out of range', () => {
    expect(fieldError('sys', 'abc')).toEqual(expect.any(String))
    expect(fieldError('dia', '12')).toEqual(expect.any(String))
    expect(fieldError('pulse', '221')).toEqual(expect.any(String))
  })
})
