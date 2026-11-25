// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import {
  DEFAULT_SETTINGS, THEME_IDS,
  type ImportResult, type Medication, type NewMedication, type NewReading, type Reading, type ReadingPatch, type Settings, type ThemeId,
} from '../shared/types'

export type CpDb = Database.Database

/** Opens (creating if needed) `chill-pill.db` in `dataDir`. */
export function openDb(dataDir: string): CpDb {
  fs.mkdirSync(dataDir, { recursive: true })
  const db = new Database(path.join(dataDir, 'chill-pill.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taken_at TEXT NOT NULL,
      sys INTEGER NOT NULL,
      dia INTEGER NOT NULL,
      pulse INTEGER NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_readings_taken_at ON readings(taken_at);
    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `)
  db.pragma('user_version = 1') // baseline for future migrations
  return db
}

interface ReadingRow { id: number; taken_at: string; sys: number; dia: number; pulse: number; note: string | null; created_at: string }
const toReading = (r: ReadingRow): Reading => ({
  id: r.id, takenAt: r.taken_at, sys: r.sys, dia: r.dia, pulse: r.pulse, note: r.note, createdAt: r.created_at,
})

export function listReadings(db: CpDb): Reading[] {
  return (db.prepare('SELECT * FROM readings ORDER BY taken_at, id').all() as ReadingRow[]).map(toReading)
}

function getReading(db: CpDb, id: number): Reading | null {
  const r = db.prepare('SELECT * FROM readings WHERE id = ?').get(id) as ReadingRow | undefined
  return r ? toReading(r) : null
}

export function createReading(db: CpDb, r: NewReading): Reading {
  const info = db
    .prepare('INSERT INTO readings (taken_at, sys, dia, pulse, note) VALUES (?, ?, ?, ?, ?)')
    .run(r.takenAt, r.sys, r.dia, r.pulse, r.note ?? null)
  return getReading(db, Number(info.lastInsertRowid))!
}

export function updateReading(db: CpDb, id: number, p: ReadingPatch): Reading | null {
  const cols: Record<string, unknown> = { taken_at: p.takenAt, sys: p.sys, dia: p.dia, pulse: p.pulse, note: p.note }
  const keys = Object.keys(cols).filter((k) => cols[k] !== undefined) // note: null is kept (clears it)
  if (keys.length) {
    db.prepare(`UPDATE readings SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => cols[k]), id)
  }
  return getReading(db, id)
}

export function deleteReading(db: CpDb, id: number): boolean {
  return db.prepare('DELETE FROM readings WHERE id = ?').run(id).changes > 0
}

interface MedRow { id: number; date: string; label: string; created_at: string }
const toMed = (m: MedRow): Medication => ({ id: m.id, date: m.date, label: m.label, createdAt: m.created_at })

export function listMedications(db: CpDb): Medication[] {
  return (db.prepare('SELECT * FROM medications ORDER BY date, id').all() as MedRow[]).map(toMed)
}

function getMedication(db: CpDb, id: number): Medication | null {
  const m = db.prepare('SELECT * FROM medications WHERE id = ?').get(id) as MedRow | undefined
  return m ? toMed(m) : null
}

export function createMedication(db: CpDb, m: NewMedication): Medication {
  const info = db.prepare('INSERT INTO medications (date, label) VALUES (?, ?)').run(m.date, m.label)
  return getMedication(db, Number(info.lastInsertRowid))!
}

export function updateMedication(db: CpDb, id: number, p: Partial<NewMedication>): Medication | null {
  const cols: Record<string, unknown> = { date: p.date, label: p.label }
  const keys = Object.keys(cols).filter((k) => cols[k] !== undefined)
  if (keys.length) {
    db.prepare(`UPDATE medications SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => cols[k]), id)
  }
  return getMedication(db, id)
}

export function deleteMedication(db: CpDb, id: number): boolean {
  return db.prepare('DELETE FROM medications WHERE id = ?').run(id).changes > 0
}

export function getSettings(db: CpDb): Settings {
  const stored = Object.fromEntries(
    (db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]).map((r) => [r.key, r.value]),
  )
  const num = (v: string | undefined, d: number) => {
    const n = v === undefined || v.trim() === '' ? NaN : Number(v)
    return Number.isFinite(n) ? n : d
  }
  return {
    theme: (THEME_IDS as readonly string[]).includes(stored.theme) ? (stored.theme as ThemeId) : DEFAULT_SETTINGS.theme,
    targetSys: num(stored.targetSys, DEFAULT_SETTINGS.targetSys),
    targetDia: num(stored.targetDia, DEFAULT_SETTINGS.targetDia),
  }
}

export function putSettings(db: CpDb, s: Settings): Settings {
  const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  db.transaction(() => {
    up.run('theme', s.theme)
    up.run('targetSys', String(s.targetSys))
    up.run('targetDia', String(s.targetDia))
  })()
  return getSettings(db)
}

/** Multiset import: per (taken_at, sys, dia, pulse), only rows beyond the count already stored are inserted. */
export function importReadings(db: CpDb, rs: NewReading[]): ImportResult {
  const count = db.prepare('SELECT COUNT(*) AS n FROM readings WHERE taken_at = ? AND sys = ? AND dia = ? AND pulse = ?')
  const insert = db.prepare('INSERT INTO readings (taken_at, sys, dia, pulse, note) VALUES (?, ?, ?, ?, ?)')
  return db.transaction((): ImportResult => {
    const existing = new Map<string, number>() // stored rows not yet matched by an incoming row
    let inserted = 0
    let skipped = 0
    for (const r of rs) {
      const key = JSON.stringify([r.takenAt, r.sys, r.dia, r.pulse])
      const left = existing.get(key) ?? (count.get(r.takenAt, r.sys, r.dia, r.pulse) as { n: number }).n
      if (left > 0) {
        existing.set(key, left - 1)
        skipped++
      } else {
        existing.set(key, 0)
        insert.run(r.takenAt, r.sys, r.dia, r.pulse, r.note ?? null)
        inserted++
      }
    }
    return { inserted, skipped }
  })()
}
