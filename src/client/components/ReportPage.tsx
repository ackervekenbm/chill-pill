// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useMemo, useState } from 'react'
import { rangeStart } from '../../shared/dates'
import { beforeAfter, dayAverages, inRange, summarize } from '../../shared/stats'
import type { Medication, RangeId, Reading, Settings, WindowAverage } from '../../shared/types'
import { useNow } from '../useNow'
import { diffText } from './BeforeAfterCard'
import { RangeChips } from './RangeChips'
import { bp, daysText } from './SummaryStrip'
import { TrendChart } from './TrendChart'

const RANGES = (['1M', '3M', '6M', '1Y', 'All'] as const).map((value) => ({ value, label: value }))
const fullDate = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })
// en-GB abbreviates September to 'Sept'; keep every month at three letters.
const long = (day: string) => fullDate.format(Date.parse(`${day}T00:00:00Z`)).replace('Sept', 'Sep')

interface Props {
  readings: Reading[]
  medications: Medication[]
  settings: Settings
  initialRange?: RangeId
  /** Local YYYY-MM-DD; defaults to the live clock (tests pin it). */
  today?: string
}

const Avg = ({ label, w }: { label: string; w: WindowAverage | null }) => (
  <div className="rp-stat">
    <span className="label">{label}</span>
    <b>{w ? bp(w) : '—'}</b>
    <span className="rp-sub">{w ? daysText(w.days) : 'no data'}</span>
  </div>
)

const Window = ({ w }: { w: WindowAverage | null }) =>
  w ? <>{bp(w)} <span className="rp-sub">({daysText(w.days)})</span></> : <span className="rp-sub">no data</span>

export function ReportPage({ readings, medications, settings, initialRange = '3M', today: todayProp }: Props) {
  const now = useNow().slice(0, 10)
  const today = todayProp ?? now
  const [range, setRange] = useState<RangeId>(initialRange)
  const [custom, setCustom] = useState({ from: '', to: '' })
  const isCustom = custom.from !== '' && custom.to !== ''
  const invalid = isCustom && custom.from > custom.to
  const from = isCustom ? custom.from : rangeStart(range, today)
  const to = isCustom ? custom.to : today

  const all = useMemo(() => dayAverages(readings), [readings])
  const days = useMemo(() => inRange(all, from, to), [all, from, to])
  const morning = useMemo(() => inRange(dayAverages(readings, 'morning'), from, to), [readings, from, to])
  const evening = useMemo(() => inRange(dayAverages(readings, 'evening'), from, to), [readings, from, to])
  const summary = summarize(days, settings)
  const meds = medications
    .filter((m) => (from === null || m.date >= from) && m.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
  const periodText = `${long(from ?? days[0]?.day ?? to)} – ${long(to)}`

  const pick = (r: RangeId) => {
    setRange(r)
    setCustom({ from: '', to: '' })
  }

  return (
    <div className="report">
      <div className="rp-controls">
        <a className="rp-back" href="/">← Back to app</a>
        <RangeChips label="Period" options={RANGES} value={range} onChange={pick} />
        <div className="rp-dates">
          <label className="rp-date">From
            <input type="date" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
          </label>
          <label className="rp-date">To
            <input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </label>
        </div>
        <button type="button" className="btn-primary" onClick={() => window.print()}>Print / save as PDF</button>
        {invalid && <p className="rp-error" role="alert">From must be on or before To.</p>}
      </div>

      <header className="rp-head">
        <h1>Chill Pill — blood pressure report</h1>
        <p className="rp-period">{periodText}</p>
        <p className="rp-meta">Generated {long(now)} · Target {settings.targetSys}/{settings.targetDia} mmHg</p>
      </header>

      {invalid ? null : days.length === 0 ? (
        <p className="rp-empty">No readings in this period</p>
      ) : (
        <>
          <section className="rp-section" aria-label="Summary">
            <h2>Summary</h2>
            <div className="rp-stats">
              <Avg label="Overall" w={summary} />
              <Avg label="Morning" w={summarize(morning, settings)} />
              <Avg label="Evening" w={summarize(evening, settings)} />
            </div>
            <p className="rp-line">
              {Math.round((summary?.onTargetShare ?? 0) * 100)}% of days on target (below {settings.targetSys}/{settings.targetDia}) · {daysText(days.length)} measured
            </p>
          </section>

          <section className="rp-section" aria-label="Trend">
            <h2>Trend</h2>
            <TrendChart days={days} medications={medications} settings={settings} from={from} to={to} showPulse={false} />
          </section>

          {meds.length > 0 && (
            <section className="rp-section" aria-label="Medication">
              <h2>Medication</h2>
              <p className="rp-sub">Day averages, 30 days before vs. the 30 days from the date</p>
              <ul className="rp-meds">
                {meds.map((m) => {
                  const ba = beforeAfter(all, m.date)
                  return (
                    <li key={m.id}>
                      <b>{long(m.date)}</b> {m.label}
                      <div className="rp-ba">
                        <span>Before <Window w={ba.before} /></span>
                        <span>After <Window w={ba.after} /></span>
                        <span>Change <b>{diffText(ba) ?? '—'}</b></span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <section className="rp-section rp-days" aria-label="Readings by day">
            <h2>Readings by day</h2>
            <table>
              <thead>
                <tr><th>Date</th><th>Readings (time sys/dia pulse)</th><th>Day avg</th></tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.day}>
                    <td className="rp-date-cell">{long(d.day)}</td>
                    <td>
                      {d.readings.map((r) => (
                        <div key={r.id}>
                          {r.takenAt.length > 10 ? r.takenAt.slice(11, 16) : '—'} {r.sys}/{r.dia} {r.pulse}
                          {r.note && <em className="rp-note">{r.note}</em>}
                        </div>
                      ))}
                    </td>
                    <td className="rp-avg">{bp(d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  )
}
