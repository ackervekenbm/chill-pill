// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { readSheet } from 'read-excel-file/node'
import { parseSheet } from '../src/server/importSheet'

const usage = 'Usage: npm run import -- <file.xlsx> --to <baseUrl> [--dry-run]'
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(usage)
  process.exit(0)
}
const dryRun = args.includes('--dry-run')
const toIdx = args.indexOf('--to')
const base = toIdx >= 0 ? args[toIdx + 1] : undefined
const file = args.find((a, i) => !a.startsWith('--') && i !== toIdx + 1)
if (!file || (!base && !dryRun)) {
  console.error(usage)
  process.exit(2)
}

async function main() {
  const { readings, problems } = parseSheet((await readSheet(file!, 'DATA')) as unknown[][])
  console.log(`Parsed ${readings.length} readings, ${problems.length} problems`)
  problems.forEach((p) => console.log(`  ${p}`))
  if (dryRun) return
  const res = await fetch(new URL('/api/import', base), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(readings),
  })
  const body = (await res.json().catch(() => ({}))) as { error?: string; field?: string }
  if (!res.ok) {
    console.error(`Import failed (${res.status}): ${body.error ?? 'unknown error'}${body.field ? ` [${body.field}]` : ''}`)
    process.exit(1)
  }
  console.log('Imported:', JSON.stringify(body))
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
