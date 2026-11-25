// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

export type CpDb = Database.Database

/** Opens (creating if needed) `chill-pill.db` in `dataDir`. */
export function openDb(dataDir: string): CpDb {
  fs.mkdirSync(dataDir, { recursive: true })
  const db = new Database(path.join(dataDir, 'chill-pill.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}
