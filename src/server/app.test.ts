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

  it('serves the manifest as application/manifest+json and icons cacheable', async () => {
    const dist = tempDir()
    fs.mkdirSync(path.join(dist, 'icons'))
    fs.writeFileSync(path.join(dist, 'index.html'), '<html>shell</html>')
    fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), '{}')
    fs.writeFileSync(path.join(dist, 'icons', 'icon-192.png'), 'x')
    const app = createApp({ db: tempDb().db, clientDist: dist })
    const manifest = await request(app).get('/manifest.webmanifest')
    expect(manifest.headers['content-type']).toContain('application/manifest+json')
    expect(manifest.headers['cache-control']).toBe('no-cache')
    const icon = await request(app).get('/icons/icon-192.png')
    expect(icon.headers['cache-control']).toBe('public, max-age=86400')
  })

  it('rejects malformed JSON with a 400', async () => {
    const res = await request(createApp({ db: tempDb().db }))
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{bad')
    expect(res.status).toBe(400)
  })
})

describe('API', () => {
  const NOW = '2026-06-15T12:00'
  const mk = () => createApp({ db: tempDb().db, now: () => NOW })
  const good = { takenAt: '2026-06-15T08:00', sys: 140, dia: 90, pulse: 60 }

  it('creates and lists readings; rejects sys <= dia and future times', async () => {
    const app = mk()
    expect((await request(app).post('/api/readings').send(good)).status).toBe(201)
    expect((await request(app).get('/api/readings')).body).toHaveLength(1)
    const b = await request(app).post('/api/readings').send({ ...good, sys: 90, dia: 95 })
    expect(b.status).toBe(400)
    expect(b.body.field).toBe('dia')
    const f = await request(app).post('/api/readings').send({ ...good, takenAt: '2026-06-15T12:10' })
    expect(f.status).toBe(400)
    expect(f.body.field).toBe('takenAt')
    expect((await request(app).post('/api/readings').send({ ...good, takenAt: '2026-06-15T12:05' })).status).toBe(201)
  })

  it('patches readings: 404, date move, merged validation, future', async () => {
    const app = mk()
    const { id } = (await request(app).post('/api/readings').send(good)).body
    expect((await request(app).patch('/api/readings/999').send({ sys: 120 })).status).toBe(404)
    expect((await request(app).patch('/api/readings/abc').send({ sys: 120 })).status).toBe(404)
    const moved = await request(app).patch(`/api/readings/${id}`).send({ takenAt: '2026-06-10T21:00' })
    expect(moved.body.takenAt).toBe('2026-06-10T21:00')
    expect((await request(app).get('/api/readings')).body[0].takenAt).toBe('2026-06-10T21:00')
    const m = await request(app).patch(`/api/readings/${id}`).send({ sys: 85 })
    expect(m.status).toBe(400)
    expect(m.body.field).toBe('dia')
    const f = await request(app).patch(`/api/readings/${id}`).send({ takenAt: '2026-06-16T08:00' })
    expect(f.body.field).toBe('takenAt')
  })

  it('deletes readings then 404s', async () => {
    const app = mk()
    const { id } = (await request(app).post('/api/readings').send(good)).body
    expect((await request(app).delete(`/api/readings/${id}`)).status).toBe(204)
    expect((await request(app).delete(`/api/readings/${id}`)).status).toBe(404)
  })

  it('handles medications', async () => {
    const app = mk()
    const c = await request(app).post('/api/medications').send({ date: '2026-06-01', label: ' Pill ' })
    expect(c.status).toBe(201)
    expect(c.body.label).toBe('Pill')
    expect((await request(app).post('/api/medications').send({ date: '2026-06-01', label: '' })).body.field).toBe('label')
    const p = await request(app).patch(`/api/medications/${c.body.id}`).send({ label: 'Other' })
    expect(p.body.label).toBe('Other')
    expect((await request(app).patch('/api/medications/999').send({ label: 'x' })).status).toBe(404)
    expect((await request(app).delete(`/api/medications/${c.body.id}`)).status).toBe(204)
    expect((await request(app).delete(`/api/medications/${c.body.id}`)).status).toBe(404)
  })

  it('gets and validates settings', async () => {
    const app = mk()
    expect((await request(app).get('/api/settings')).body.theme).toBe('calm')
    const bad = await request(app).put('/api/settings').send({ theme: 'neon', targetSys: 135, targetDia: 85 })
    expect(bad.status).toBe(400)
    expect(bad.body.field).toBe('theme')
    const ok = await request(app).put('/api/settings').send({ theme: 'dashboard', targetSys: 130, targetDia: 80 })
    expect(ok.body.theme).toBe('dashboard')
  })

  it('imports idempotently and all-or-nothing', async () => {
    const app = mk()
    const rows = [good, { ...good, takenAt: '2026-06-14' }]
    expect((await request(app).post('/api/import').send(rows)).body).toEqual({ inserted: 2, skipped: 0 })
    expect((await request(app).post('/api/import').send(rows)).body.inserted).toBe(0)
    const bad = await request(app).post('/api/import').send([{ ...good, takenAt: '2026-01-01' }, { ...good, takenAt: '2026-07-01' }])
    expect(bad.status).toBe(400)
    expect((await request(app).get('/api/readings')).body).toHaveLength(2)
  })

  it('exports csv', async () => {
    const app = mk()
    await request(app).post('/api/readings').send({ ...good, note: 'a, "b"' })
    await request(app).post('/api/medications').send({ date: '2026-06-01', label: 'Pill' })
    const res = await request(app).get('/api/export.csv')
    expect(res.headers['content-disposition']).toBe('attachment; filename="chill-pill-2026-06-15.csv"')
    expect(res.text).toContain('type,date,time,sys,dia,pulse,note_or_label')
    expect(res.text).toContain('reading,2026-06-15,08:00,140,90,60,"a, ""b"""')
    expect(res.text).toContain('medication,2026-06-01,,,,,Pill')
  })
})
