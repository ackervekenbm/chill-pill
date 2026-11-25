// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

// Posts ~9 months of made-up readings and two made-up medication changes to a running Chill Pill.
// Deterministic (fixed PRNG seed); dates are relative to today so every range has data.
import { addDays, nowLocal } from '../src/shared/dates'
import type { NewMedication, NewReading } from '../src/shared/types'

const i = process.argv.indexOf('--to')
const base = i > 0 ? process.argv[i + 1] : undefined
if (!base) {
  console.error('Usage: npm run seed -- --to <baseUrl>')
  process.exit(2)
}

// mulberry32
let seed = 0x5eed
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const jitter = (n: number) => (rand() - 0.5) * 2 * n
const pad = (n: number) => String(n).padStart(2, '0')
const time = (fromMin: number, toMin: number) => {
  const m = Math.floor(fromMin + rand() * (toMin - fromMin))
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

const today = nowLocal().slice(0, 10)
const SPAN = 275
const meds: NewMedication[] = [
  { date: addDays(today, -190), label: 'Started Examplol 5 mg' },
  { date: addDays(today, -95), label: 'Examplol up to 10 mg' },
]
const readings: NewReading[] = []
let sys = 154
let dia = 96
for (let d = -SPAN; d < 0; d++) {
  // Each medication change slowly pulls the level down; otherwise a random walk.
  const drift = meds.filter((m) => m.date <= addDays(today, d)).length * 0.12
  sys += jitter(1.6) - drift + (150 - drift * 50 - sys) * 0.02
  dia += jitter(1.1) - drift * 0.6 + (94 - drift * 30 - dia) * 0.02
  if (rand() > 0.21) continue // ≈1.5 measuring days a week
  const day = addDays(today, d)
  const evening = rand() < 0.3
  const n = 2 + (rand() < 0.4 ? 1 : 0)
  for (let k = 0; k < n; k++) {
    const t = evening && k === n - 1 ? time(19 * 60, 21 * 60) : time(7 * 60 + k * 30, 7 * 60 + k * 30 + 30)
    const s = Math.round(sys + jitter(6) + (t >= '12:00' ? 4 : 0))
    readings.push({ takenAt: `${day}T${t}`, sys: s, dia: Math.min(Math.round(dia + jitter(4)), s - 25), pulse: Math.round(68 + jitter(9)) })
  }
}

async function post(path: string, body: unknown) {
  const res = await fetch(new URL(path, base), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function main() {
  const existing = (await (await fetch(new URL('/api/readings', base))).json()) as unknown[]
  if (existing.length > 0) {
    console.error(`Refusing to seed: ${base} already has readings. Seed only an empty instance.`)
    process.exit(1)
  }
  console.log('import', await post('/api/import', readings))
  for (const m of meds) await post('/api/medications', m)
  console.log(`added ${meds.length} medication changes`)
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
