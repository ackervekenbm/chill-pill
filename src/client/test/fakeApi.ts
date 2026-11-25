// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { vi } from 'vitest'
import type { Medication, Reading, Settings } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../../shared/types'

export function reading(over: Partial<Reading> = {}): Reading {
  return { id: 1, takenAt: '2026-11-20T08:00', sys: 140, dia: 90, pulse: 70, note: null, createdAt: '2026-11-20T08:00:00Z', ...over }
}

export function medication(over: Partial<Medication> = {}): Medication {
  return { id: 1, date: '2026-11-10', label: 'Started Examplol 5 mg', createdAt: '2026-11-10T08:00:00Z', ...over }
}

/** An in-memory stand-in for the server behind fetch; records every request. */
export function fakeApi(init: { readings?: Reading[]; medications?: Medication[]; settings?: Settings } = {}) {
  let readings = [...(init.readings ?? [])]
  let medications = [...(init.medications ?? [])]
  let settings = init.settings ?? DEFAULT_SETTINGS
  let nextId = 1 + Math.max(0, ...readings.map((r) => r.id), ...medications.map((m) => m.id))
  let failNext = 0
  const calls: Array<{ method: string; path: string; body: unknown }> = []

  const json = (body: unknown, code = 200) =>
    new Response(JSON.stringify(body), { status: code, headers: { 'Content-Type': 'application/json' } })

  const fetch = vi.fn(async (input: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET'
    const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined
    calls.push({ method, path: input, body })
    if (failNext > 0) {
      failNext--
      return json({ error: 'database is locked' }, 500)
    }
    if (input === '/api/settings') {
      if (method === 'PUT') settings = body as unknown as Settings
      return json(settings)
    }
    const m = /^\/api\/(readings|medications)(?:\/(\d+))?$/.exec(input)
    if (!m) return json({ error: 'unexpected request' }, 500)
    const isReading = m[1] === 'readings'
    const id = m[2] ? Number(m[2]) : null
    const list = (isReading ? readings : medications) as Array<{ id: number }>
    const set = (next: Array<{ id: number }>) => {
      if (isReading) readings = next as Reading[]
      else medications = next as Medication[]
    }
    if (id === null && method === 'GET') return json(list)
    if (id === null && method === 'POST') {
      const created = { id: nextId++, createdAt: '2026-11-25T08:00:00Z', ...(isReading ? { note: null } : {}), ...body! }
      set([...list, created])
      return json(created, 201)
    }
    const found = list.find((x) => x.id === id)
    if (!found) return json({ error: 'not found' }, 404)
    if (method === 'DELETE') {
      set(list.filter((x) => x.id !== id))
      return new Response(null, { status: 204 })
    }
    const updated = { ...found, ...body }
    set(list.map((x) => (x.id === id ? updated : x)))
    return json(updated)
  })

  vi.stubGlobal('fetch', fetch)
  return {
    fetch,
    calls,
    readings: () => readings,
    medications: () => medications,
    settings: () => settings,
    /** The next n requests answer 500. */
    failNext: (n = 1) => {
      failNext = n
    },
    writes: () => calls.filter((c) => c.method !== 'GET'),
  }
}
