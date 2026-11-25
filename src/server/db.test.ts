// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../shared/types'
import {
  createMedication, createReading, deleteMedication, deleteReading, getSettings, importReadings,
  listMedications, listReadings, putSettings, updateMedication, updateReading,
} from './db'
import { tempDb } from './test/helpers'

const A = { takenAt: '2026-01-05', sys: 130, dia: 80, pulse: 60 }
const B = { takenAt: '2026-01-06', sys: 140, dia: 90, pulse: 70 }

describe('readings', () => {
  it('round-trips and orders by takenAt, id', () => {
    const { db } = tempDb()
    const late = createReading(db, { takenAt: '2026-02-01T08:00', sys: 120, dia: 70, pulse: 55, note: 'x' })
    createReading(db, { ...A })
    expect(late).toMatchObject({ takenAt: '2026-02-01T08:00', note: 'x' })
    expect(late.createdAt).toBeTruthy()
    const list = listReadings(db)
    expect(list.map((r) => r.takenAt)).toEqual(['2026-01-05', '2026-02-01T08:00'])
    expect(list[0].note).toBeNull()
  })
  it('updates, clears note, keeps on absent, empty patch, missing id', () => {
    const { db } = tempDb()
    const r = createReading(db, { ...A, note: 'hi' })
    expect(updateReading(db, r.id, {})).toEqual(r)
    expect(updateReading(db, r.id, { sys: 150 })).toMatchObject({ sys: 150, note: 'hi' })
    expect(updateReading(db, r.id, { note: null })?.note).toBeNull()
    expect(updateReading(db, 999, { sys: 1 })).toBeNull()
    expect(updateReading(db, 999, {})).toBeNull()
  })
  it('deletes', () => {
    const { db } = tempDb()
    const r = createReading(db, A)
    expect(deleteReading(db, r.id)).toBe(true)
    expect(deleteReading(db, r.id)).toBe(false)
  })
})

describe('medications', () => {
  it('CRUD', () => {
    const { db } = tempDb()
    const m = createMedication(db, { date: '2026-01-05', label: 'Pill' })
    expect(listMedications(db)).toEqual([m])
    expect(updateMedication(db, m.id, { label: 'Other' })).toMatchObject({ label: 'Other', date: '2026-01-05' })
    expect(updateMedication(db, m.id, {})?.label).toBe('Other')
    expect(updateMedication(db, 999, {})).toBeNull()
    expect(deleteMedication(db, m.id)).toBe(true)
    expect(deleteMedication(db, m.id)).toBe(false)
  })
})

describe('settings', () => {
  it('defaults, round-trip, bad stored values', () => {
    const { db } = tempDb()
    expect(getSettings(db)).toEqual(DEFAULT_SETTINGS)
    expect(putSettings(db, { theme: 'dashboard', targetSys: 130, targetDia: 80 })).toEqual({ theme: 'dashboard', targetSys: 130, targetDia: 80 })
    db.prepare(`UPDATE settings SET value='neon' WHERE key='theme'`).run()
    db.prepare(`UPDATE settings SET value='abc' WHERE key='targetSys'`).run()
    expect(getSettings(db)).toEqual({ theme: 'calm', targetSys: 135, targetDia: 80 })
  })
})

describe('importReadings', () => {
  it('treats duplicates as a multiset', () => {
    const { db } = tempDb()
    expect(importReadings(db, [A, A, B])).toEqual({ inserted: 3, skipped: 0 })
    expect(importReadings(db, [A, A, B])).toEqual({ inserted: 0, skipped: 3 })
    expect(importReadings(db, [A, A, A])).toEqual({ inserted: 1, skipped: 2 })
    expect(listReadings(db)).toHaveLength(4)
  })
  it('stores note', () => {
    const { db } = tempDb()
    importReadings(db, [{ ...A, note: 'n' }])
    expect(listReadings(db)[0].note).toBe('n')
  })
})

it('stamps a fresh database with schema version 1', () => {
  const { db } = tempDb()
  expect(db.pragma('user_version', { simple: true })).toBe(1)
})
