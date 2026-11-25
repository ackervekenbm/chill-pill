// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach } from 'vitest'
import { openDb, type CpDb } from '../db'

const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.()
})

/** A fresh database in a temp dir, closed and removed after the test. */
export function tempDb(): { db: CpDb; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chill-pill-test-'))
  const db = openDb(dir)
  cleanups.push(() => {
    if (db.open) db.close()
    fs.rmSync(dir, { recursive: true, force: true })
  })
  return { db, dir }
}

export function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chill-pill-test-'))
  cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }))
  return dir
}
