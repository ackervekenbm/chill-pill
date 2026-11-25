// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import fs from 'node:fs'
import path from 'node:path'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './app'
import { tempDb, tempDir } from './test/helpers'

describe('createApp', () => {
  it('answers /api/health', async () => {
    const res = await request(createApp({ db: tempDb().db })).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('404s unknown api routes as JSON', async () => {
    const res = await request(createApp({ db: tempDb().db })).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'not found' })
  })

  it('serves the client with cache headers and SPA fallback', async () => {
    const dist = tempDir()
    fs.mkdirSync(path.join(dist, 'assets'))
    fs.writeFileSync(path.join(dist, 'index.html'), '<html>shell</html>')
    fs.writeFileSync(path.join(dist, 'assets', 'a.js'), '1')
    const app = createApp({ db: tempDb().db, clientDist: dist })
    const asset = await request(app).get('/assets/a.js')
    expect(asset.headers['cache-control']).toContain('immutable')
    const page = await request(app).get('/history')
    expect(page.text).toContain('shell')
    expect(page.headers['cache-control']).toBe('no-cache')
  })

  it('rejects malformed JSON with a 400', async () => {
    const res = await request(createApp({ db: tempDb().db }))
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{bad')
    expect(res.status).toBe(400)
  })
})
