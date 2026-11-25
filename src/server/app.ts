// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import fs from 'node:fs'
import path from 'node:path'
import express, { type ErrorRequestHandler } from 'express'
import { z } from 'zod'
import { nowLocal, isFuture } from '../shared/dates'
import {
  importSchema, medicationPatchSchema, newMedicationSchema, newReadingSchema, readingPatchSchema, settingsSchema,
} from '../shared/validation'
import { toCsv } from './csv'
import * as q from './db'
import type { CpDb } from './db'

export interface AppOptions {
  db: CpDb
  /** Built client to serve; omitted (or missing on disk) serves the API only. */
  clientDist?: string
  /** Current local time as 'YYYY-MM-DDTHH:MM'; injectable for tests. */
  now?: () => string
}

class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly field?: string) {
    super(message)
  }
}

const bad = (message: string, field?: string) => new HttpError(400, message, field)

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body)
  if (r.success) return r.data
  const i = r.error.issues[0]
  throw bad(i.message, i.path.length ? String(i.path[0]) : undefined)
}

/** Positive-integer id, else 404 (malformed ids are treated as unknown). */
function id(raw: string): number {
  if (!/^[1-9]\d*$/.test(raw)) throw new HttpError(404, 'not found')
  return Number(raw)
}

export function createApp(opts: AppOptions): express.Express {
  const { db } = opts
  const now = opts.now ?? (() => nowLocal())
  const notFuture = (takenAt: string) => {
    if (isFuture(takenAt, now())) throw bad('Reading is in the future', 'takenAt')
  }
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    let ok = true
    try {
      db.prepare('SELECT 1').get()
    } catch {
      ok = false
    }
    res.status(ok ? 200 : 500).json({ ok })
  })

  app.get('/api/readings', (_req, res) => {
    res.json(q.listReadings(db))
  })
  app.post('/api/readings', (req, res) => {
    const r = parse(newReadingSchema, req.body)
    notFuture(r.takenAt)
    res.status(201).json(q.createReading(db, r))
  })
  app.patch('/api/readings/:id', (req, res) => {
    const rid = id(req.params.id)
    const stored = q.listReadings(db).find((r) => r.id === rid)
    if (!stored) throw new HttpError(404, 'not found')
    const patch = parse(readingPatchSchema, req.body)
    // The patch schema only checks sys > dia when both are present, so validate the merged result.
    const { takenAt, sys, dia, pulse, note } = stored
    const merged = parse(newReadingSchema, { takenAt, sys, dia, pulse, note, ...patch })
    notFuture(merged.takenAt)
    res.json(q.updateReading(db, rid, patch))
  })
  app.delete('/api/readings/:id', (req, res) => {
    if (!q.deleteReading(db, id(req.params.id))) throw new HttpError(404, 'not found')
    res.status(204).end()
  })

  app.get('/api/medications', (_req, res) => {
    res.json(q.listMedications(db))
  })
  app.post('/api/medications', (req, res) => {
    res.status(201).json(q.createMedication(db, parse(newMedicationSchema, req.body)))
  })
  app.patch('/api/medications/:id', (req, res) => {
    const mid = id(req.params.id)
    const m = q.updateMedication(db, mid, parse(medicationPatchSchema, req.body))
    if (!m) throw new HttpError(404, 'not found')
    res.json(m)
  })
  app.delete('/api/medications/:id', (req, res) => {
    if (!q.deleteMedication(db, id(req.params.id))) throw new HttpError(404, 'not found')
    res.status(204).end()
  })

  app.get('/api/settings', (_req, res) => {
    res.json(q.getSettings(db))
  })
  app.put('/api/settings', (req, res) => {
    res.json(q.putSettings(db, parse(settingsSchema, req.body)))
  })

  app.post('/api/import', (req, res) => {
    const rs = parse(importSchema, req.body)
    rs.forEach((r) => notFuture(r.takenAt))
    res.json(q.importReadings(db, rs))
  })

  app.get('/api/export.csv', (_req, res) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="chill-pill-${now().slice(0, 10)}.csv"`)
    res.send(toCsv(q.listReadings(db), q.listMedications(db)))
  })

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not found' })
  })

  serveClient(app, opts.clientDist)

  const onError: ErrorRequestHandler = (err, _req, res, next) => {
    if (res.headersSent) return next(err)
    if (err instanceof HttpError) {
      res.status(err.status).json(err.field ? { error: err.message, field: err.field } : { error: err.message })
      return
    }
    // body-parser marks malformed or oversized bodies with a 4xx status.
    const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 500 ? err.status : 500
    if (status === 500) console.error('[api]', err)
    res.status(status).json({ error: status === 500 ? 'internal error' : String(err.message) })
  }
  app.use(onError)

  return app
}

function serveClient(app: express.Express, distDir: string | undefined): void {
  if (!distDir) return
  const indexFile = path.join(distDir, 'index.html')
  if (!fs.existsSync(indexFile)) return
  // Vite fingerprints everything under /assets, so those never change; the
  // app shell must always be revalidated so a redeploy shows up on refresh.
  app.use(
    express.static(distDir, {
      setHeaders(res, filePath) {
        if (filePath.endsWith('.webmanifest')) res.setHeader('Content-Type', 'application/manifest+json')
        const inDir = (dir: string) => filePath.includes(`${path.sep}${dir}${path.sep}`)
        res.setHeader(
          'Cache-Control',
          inDir('assets')
            ? 'public, max-age=31536000, immutable'
            : inDir('icons') || /\.(svg|png)$/.test(filePath)
              ? 'public, max-age=86400'
              : 'no-cache',
        )
      },
    }),
  )
  app.get(/.*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(indexFile)
  })
}
