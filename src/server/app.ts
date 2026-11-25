// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import fs from 'node:fs'
import path from 'node:path'
import express, { type ErrorRequestHandler } from 'express'
import type { CpDb } from './db'

export interface AppOptions {
  db: CpDb
  /** Built client to serve; omitted (or missing on disk) serves the API only. */
  clientDist?: string
}

export function createApp(opts: AppOptions): express.Express {
  const { db } = opts
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

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not found' })
  })

  serveClient(app, opts.clientDist)

  const onError: ErrorRequestHandler = (err, _req, res, next) => {
    if (res.headersSent) return next(err)
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
        res.setHeader(
          'Cache-Control',
          filePath.includes(`${path.sep}assets${path.sep}`)
            ? 'public, max-age=31536000, immutable'
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
