// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useId } from 'react'
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
  type TooltipContentProps, type TooltipValueType,
} from 'recharts'
import type { DayAverage, Medication, Settings } from '../../shared/types'
import { bp } from './SummaryStrip'

// Colours come from CSS classes in trend.css (var() in SVG attributes is not reliable in every browser).
const DAY = 86_400_000
const ts = (day: string) => Date.parse(`${day}T00:00:00Z`)
// en-GB abbreviates September to 'Sept'; keep every month at three letters.
const fmt = (o: Intl.DateTimeFormatOptions) => {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...o })
  return { format: (d: number | Date) => f.format(d).replace('Sept', 'Sep') }
}
const dayMonth = fmt({ day: 'numeric', month: 'short' })
const month = fmt({ month: 'short' })
const monthYear = fmt({ month: 'short', year: '2-digit' })
const longDate = fmt({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const medDate = fmt({ day: 'numeric', month: 'short' })
export const shortDate = (day: string) => medDate.format(ts(day))

/** Weekly ticks for a month, otherwise month starts (thinned so about six fit on a phone). */
function xTicks(start: number, end: number): { ticks: number[]; format: (t: number) => string } {
  const span = (end - start) / DAY
  if (span <= 45) {
    const ticks = []
    for (let t = start; t <= end; t += 7 * DAY) ticks.push(t)
    return { ticks, format: (t) => dayMonth.format(t) }
  }
  const s = new Date(start)
  const firsts = []
  for (let m = s.getUTCMonth() + 1; ; m++) {
    const t = Date.UTC(s.getUTCFullYear(), m, 1)
    if (t > end) break
    firsts.push(t)
  }
  const step = Math.max(1, Math.ceil(firsts.length / 7))
  const f = span > 400 ? monthYear : month
  return { ticks: firsts.filter((_, i) => i % step === 0), format: (t) => f.format(t) }
}

/** Padded to tens, always including both target lines. */
function yAxis(values: number[]): { domain: [number, number]; ticks: number[] } {
  const lo = Math.floor((Math.min(...values) - 5) / 10) * 10
  const hi = Math.ceil((Math.max(...values) + 5) / 10) * 10
  const step = hi - lo > 60 ? 20 : 10
  const ticks = []
  for (let v = lo; v <= hi; v += step) ticks.push(v)
  return { domain: [lo, hi], ticks }
}

// Axis text sits in a portal layer with an inline fill, so colour it via currentColor (.trend-chart sets color).
const tick = { fill: 'currentColor', fontSize: 11 }
const clip = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

function Tip({ active, payload }: Pick<TooltipContentProps<TooltipValueType, string>, 'active' | 'payload'>) {
  const d = active ? (payload?.[0]?.payload as { d?: DayAverage } | undefined)?.d : undefined
  if (!d) return null
  return (
    <div className="trend-tip">
      <b>{longDate.format(ts(d.day))}</b>
      <div className="trend-tip-avg">
        {bp(d)} <span>· pulse {Math.round(d.pulse)}{d.count > 1 ? ` · avg of ${d.count}` : ''}</span>
      </div>
      {d.count > 1 && (
        <ul>
          {d.readings.map((r) => (
            <li key={r.id}>
              <span>{r.takenAt.slice(11, 16) || '–'}</span> {r.sys}/{r.dia} {r.pulse}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface Props {
  days: DayAverage[]
  medications: Medication[]
  settings: Settings
  from: string | null
  to: string
  showPulse: boolean
  onMedication?: (m: Medication) => void
  openId?: number | null
}

export function TrendChart({ days, medications, settings, from, to, showPulse, onMedication, openId }: Props) {
  const gid = useId().replace(/:/g, '')
  if (days.length === 0) return <p className="trend-empty">No readings in this range</p>

  const start = ts(from ?? days[0].day)
  const end = ts(to)
  const meds = medications
    .filter((m) => ts(m.date) >= start && ts(m.date) <= end)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  const data = days.map((d) => ({ t: ts(d.day), sys: d.sys, dia: d.dia, pulse: d.pulse, d }))
  const x = xTicks(start, end)
  const y = yAxis([
    ...days.flatMap((d) => (showPulse ? [d.sys, d.dia, d.pulse] : [d.sys, d.dia])),
    settings.targetSys,
    settings.targetDia,
  ])
  const marks = (k: string) => ({
    connectNulls: true, isAnimationActive: false,
    dot: { r: 2.5, strokeWidth: 0, className: `dot-${k}` }, activeDot: { r: 5, strokeWidth: 2, className: `adot-${k}` },
  })

  return (
    <>
      <div className="trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 24, right: 14, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" className="area-stop-top" />
                <stop offset="1" className="area-stop-bottom" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} className="trend-grid" />
            <XAxis
              type="number" scale="time" dataKey="t" domain={[start, end]} ticks={x.ticks} tickFormatter={x.format}
              tick={tick} tickLine={false} axisLine={false} tickMargin={8}
            />
            <YAxis domain={y.domain} ticks={y.ticks} width={34} tick={tick} tickLine={false} axisLine={false} />
            <ReferenceLine y={settings.targetSys} className="ref-sys" strokeDasharray="5 4" />
            <ReferenceLine y={settings.targetDia} className="ref-dia" strokeDasharray="5 4" />
            {meds.map((m, i) => (
              <ReferenceLine
                key={m.id} x={ts(m.date)} className="ref-med"
                label={({ viewBox }: { viewBox?: { x?: number; y?: number } }) => {
                  const vx = viewBox?.x ?? 0
                  const vy = (viewBox?.y ?? 0) + (i % 2) * 16 // alternate rows so neighbouring labels don't collide
                  const left = (ts(m.date) - start) / (end - start || 1) > 0.6
                  return (
                    <g className="med-marker" onClick={() => onMedication?.(m)}>
                      <circle cx={vx} cy={vy} r={4.5} />
                      <text x={left ? vx - 8 : vx + 8} y={vy + 4} textAnchor={left ? 'end' : 'start'}>{clip(m.label)}</text>
                    </g>
                  )
                }}
              />
            ))}
            <Area dataKey="sys" className="area-sys" fill={`url(#${gid})`} stroke="none" connectNulls activeDot={false} tooltipType="none" isAnimationActive={false} />
            <Line dataKey="sys" name="Sys" className="line-sys" strokeWidth={2.5} {...marks('sys')} />
            <Line dataKey="dia" name="Dia" className="line-dia" strokeWidth={2.5} {...marks('dia')} />
            {showPulse && (
              <Line dataKey="pulse" name="Pulse" className="line-pulse" strokeWidth={2} {...marks('pulse')} />
            )}
            <Tooltip content={Tip} cursor={{ className: 'trend-cursor' }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="trend-legend" aria-hidden="true">
        <li className="lg-sys">Sys</li>
        <li className="lg-dia">Dia</li>
        {showPulse && <li className="lg-pulse">Pulse</li>}
        <li className="lg-target">Target {settings.targetSys}/{settings.targetDia}</li>
      </ul>
      {onMedication && meds.length > 0 && (
        <ul className="med-chips" aria-label="Medication changes">
          {meds.map((m) => (
            <li key={m.id}>
              <button type="button" className="med-chip" aria-expanded={openId === m.id} onClick={() => onMedication(m)}>
                <span aria-hidden="true">💊</span> {shortDate(m.date)} · {m.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
