// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import path from 'node:path'
import { createApp } from './app'
import { openDb } from './db'
import { env, envInt, loadEnv } from './env'

loadEnv()

const db = openDb(env('DATA_DIR', path.join(process.cwd(), 'data')))
const app = createApp({ db, clientDist: path.join(process.cwd(), 'dist') })

const host = env('HOST', '0.0.0.0')
const port = envInt('PORT', 3000)
const server = app.listen(port, host, () => {
  console.log(`chill-pill listening on http://${host}:${port}`)
})

let shuttingDown = false

function shutdown(signal: string): void {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`${signal} received, shutting down`)
  server.close(() => {
    db.close()
    process.exit(0)
  })
  server.closeIdleConnections()
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
