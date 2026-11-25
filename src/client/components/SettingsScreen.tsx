// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useEffect, useRef, useState } from 'react'
import type { Settings, ThemeId } from '../../shared/types'
import { settingsSchema } from '../../shared/validation'
import { exportUrl } from '../api'
import { applyTheme, THEMES } from '../theme'

interface Props {
  settings: Settings
  onSave: (s: Settings) => Promise<unknown>
}

const msg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

function buildLine() {
  if (__BUILD_SHA__ === 'dev') return 'Chill Pill · development build'
  const t = __BUILD_TIME__ ? new Date(__BUILD_TIME__) : null
  const built = t && !isNaN(+t) ? t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace('Sept', 'Sep') : ''
  return `Chill Pill · ${__BUILD_SHA__.slice(0, 7)}${built ? ` · built ${built}` : ''}`
}

/** A theme card's mini preview: the theme's background, a sparkline and a dot in its accent. */
function Preview({ bg, accent }: { bg: string; accent: string }) {
  return (
    <svg className="theme-prev" viewBox="0 0 80 40" aria-hidden="true">
      <rect width="80" height="40" rx="8" fill={bg} />
      <polyline points="8,28 22,22 34,26 48,14 62,18 72,9" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="72" cy="9" r="3.5" fill={accent} />
    </svg>
  )
}

export function SettingsScreen({ settings, onSave }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [targetError, setTargetError] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemeId>(settings.theme)
  const [sys, setSys] = useState(String(settings.targetSys))
  const [dia, setDia] = useState(String(settings.targetDia))
  // Every save builds on the latest settings, so a theme tap right after a target blur can't undo the target.
  const latest = useRef(settings)
  useEffect(() => {
    latest.current = settings
  }, [settings])

  const pick = async (id: ThemeId) => {
    if (id === theme) return
    const prev = theme
    setError(null)
    setTheme(id)
    applyTheme(id)
    const next = { ...latest.current, theme: id }
    const before = latest.current
    latest.current = next
    try {
      await onSave(next)
    } catch (e) {
      if (latest.current === next) latest.current = before
      setTheme(prev)
      applyTheme(prev)
      setError(`Couldn't save the theme: ${msg(e)}`)
    }
  }

  const saveTargets = async () => {
    if (sys === String(latest.current.targetSys) && dia === String(latest.current.targetDia)) return setTargetError(null)
    const before = latest.current
    const next = { ...before, targetSys: Number(sys), targetDia: Number(dia) }
    const parsed = settingsSchema.safeParse(sys.trim() === '' || dia.trim() === '' ? {} : next)
    if (!parsed.success) return setTargetError('Systolic must be 60–260 and diastolic 30–160, whole numbers')
    if (next.targetSys <= next.targetDia) return setTargetError('Systolic target must be higher than diastolic')
    setTargetError(null)
    setError(null)
    latest.current = next
    try {
      await onSave(next)
    } catch (e) {
      if (latest.current === next) latest.current = before
      setError(`Couldn't save the targets: ${msg(e)}`) // typed values stay in the fields
    }
  }

  return (
    <section className="card settings" aria-label="Settings">
      <h2 className="card-title">Settings</h2>
      {error && <div className="banner-err" role="alert">{error}</div>}

      <h3 className="set-h" id="set-theme">Theme</h3>
      <div className="theme-grid" role="radiogroup" aria-labelledby="set-theme">
        {THEMES.map((t) => (
          <label key={t.id} className={`theme-card${theme === t.id ? ' on' : ''}`}>
            <input type="radio" name="theme" className="sr-only" checked={theme === t.id} onChange={() => void pick(t.id)} />
            <Preview bg={t.bg} accent={t.accent} />
            <span className="theme-name">{t.label}</span>
          </label>
        ))}
      </div>

      <h3 className="set-h" id="set-target">Blood pressure target</h3>
      <p className="muted">A day counts as on target when its average is below both numbers.</p>
      <div className="target-row">
        <label className="fld">
          <span>Systolic target</span>
          <input className="field" inputMode="numeric" value={sys} aria-invalid={!!targetError} onBlur={() => void saveTargets()} onChange={(e) => setSys(e.target.value)} />
        </label>
        <span className="target-slash" aria-hidden="true">/</span>
        <label className="fld">
          <span>Diastolic target</span>
          <input className="field" inputMode="numeric" value={dia} aria-invalid={!!targetError} onBlur={() => void saveTargets()} onChange={(e) => setDia(e.target.value)} />
        </label>
      </div>
      {targetError && <div className="banner-err" role="alert">{targetError}</div>}

      <h3 className="set-h">Your data</h3>
      <div className="set-links">
        <a className="btn-link" href={exportUrl} download>Export CSV</a>
        <a className="btn-link" href="/report">Doctor report</a>
      </div>

      <p className="about">{buildLine()}</p>
    </section>
  )
}
