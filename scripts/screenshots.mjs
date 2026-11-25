// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

/**
 * Regenerates the README screenshots in docs/screenshots/ from made-up demo
 * data, so no real reading ever lands in the repo:
 * {calm,dashboard,editorial}-{phone,desktop}.png.
 *
 *   npm run build && DATA_DIR=$(mktemp -d) PORT=3991 npm start   # an EMPTY instance
 *   npm i --no-save playwright && npx playwright install chromium
 *   node scripts/screenshots.mjs [http://localhost:3991]
 *
 * It seeds the demo data itself (scripts/seed-demo.ts) and refuses to run
 * against an instance that already holds readings. Playwright is not a
 * dependency on purpose: only this script and the banner need it.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const { chromium } = await import('playwright').catch(() => {
  console.error('Needs Playwright: npm i --no-save playwright && npx playwright install chromium')
  process.exit(1)
})

const APP = process.argv[2] ?? 'http://localhost:3991'
const OUT = path.resolve('docs/screenshots')
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const DESKTOP = { viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 }
const THEMES = ['calm', 'dashboard', 'editorial']

async function api(route, method = 'GET', body) {
  const res = await fetch(new URL(route, APP), {
    method,
    headers: { 'content-type': 'application/json' },
    body: body && JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${route}: ${res.status} ${await res.text()}`)
  return res.json()
}

// Never mix demo data into someone's real readings, and never photograph them.
if ((await api('/api/readings')).length > 0) {
  console.error(`${APP} already has readings. Point this at an empty instance (fresh DATA_DIR).`)
  process.exit(1)
}
execFileSync('npm', ['run', 'seed', '--', '--to', APP], { stdio: 'inherit' })
// Two readings "just now", so the Today card shows a filled-in day.
const now = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Brussels' }).slice(0, 16).replace(' ', 'T')
await api('/api/readings', 'POST', { takenAt: now, sys: 128, dia: 82, pulse: 64 })
await api('/api/readings', 'POST', { takenAt: now, sys: 125, dia: 80, pulse: 62 })

await fs.mkdir(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })
for (const theme of THEMES) {
  await api('/api/settings', 'PUT', { theme, targetSys: 135, targetDia: 85 })
  for (const [kind, device] of [['phone', PHONE], ['desktop', DESKTOP]]) {
    const page = await browser.newPage({ ...device, reducedMotion: 'reduce' })
    page.on('pageerror', (error) => console.error('page error:', error.message))
    await page.goto(APP, { waitUntil: 'networkidle' })
    await page.waitForSelector('.recharts-surface')
    if (kind === 'phone') {
      // Scroll the whole trend card into view just above the bottom tab bar.
      await page.evaluate(() => {
        const card = document.querySelector('.card.trend').getBoundingClientRect()
        const tabs = document.querySelector('nav.tabs').getBoundingClientRect()
        window.scrollBy(0, card.bottom - tabs.top + 12)
      })
    }
    await page.waitForTimeout(600)
    // Viewport only: the phone page scrolls on below the chart.
    await page.screenshot({ path: path.join(OUT, `${theme}-${kind}.png`) })
    console.log('wrote', `${theme}-${kind}.png`)
    await page.close()
  }
}
await api('/api/settings', 'PUT', { theme: 'calm', targetSys: 135, targetDia: 85 })
await browser.close()
