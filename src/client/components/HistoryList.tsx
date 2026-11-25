// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import type { DayAverage, Settings } from '../../shared/types'
import { isOnTarget } from '../../shared/stats'
import { useNow } from '../useNow'
import { NoteIcon } from './icons'
import { useIsDesktop } from './Shell'

interface Props {
  days: DayAverage[] // ascending, as dayAverages returns them
  settings: Settings
  onOpen: (day: string) => void
}

/** "Wed 25 Nov", with the year when it is not the current one. */
export function formatDay(day: string, thisYear: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
      .formatToParts(new Date(`${day}T00:00:00Z`))
      .map((x) => [x.type, x.value]),
  )
  return `${p.weekday} ${p.day} ${p.month.replace('Sept', 'Sep')}${day.slice(0, 4) === thisYear ? '' : ` ${p.year}`}`
}

const avg = (d: DayAverage) => `${Math.round(d.sys)}/${Math.round(d.dia)}`
const lastNote = (d: DayAverage) => [...d.readings].reverse().find((r) => r.note)?.note ?? null

export function HistoryList({ days, settings, onOpen }: Props) {
  const desktop = useIsDesktop()
  const thisYear = useNow().slice(0, 4)
  if (days.length === 0) return <p className="hist-empty">No readings yet</p>
  const newest = [...days].reverse()
  const flag = (d: DayAverage) => (isOnTarget(d, settings) ? <span className="sr-only">on target</span> : null)

  if (desktop) {
    return (
      <table className="hist-table">
        <thead>
          <tr><th scope="col">Date</th><th scope="col">Avg</th><th scope="col">Pulse</th><th scope="col">Readings</th><th scope="col">Note</th></tr>
        </thead>
        <tbody>
          {newest.map((d) => (
            <tr key={d.day} className={isOnTarget(d, settings) ? 'on-target' : undefined} onClick={() => onOpen(d.day)}>
              <td><button type="button" className="hist-open" onClick={(e) => { e.stopPropagation(); onOpen(d.day) }}>{formatDay(d.day, thisYear)}{flag(d)}</button></td>
              <td className="num">{avg(d)}</td>
              <td className="num">{Math.round(d.pulse)}</td>
              <td className="num">{d.count}</td>
              <td className="hist-note">{lastNote(d)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  return (
    <ul className="hist-list">
      {newest.map((d) => (
        <li key={d.day}>
          <button type="button" className={`hist-row${isOnTarget(d, settings) ? ' on-target' : ''}`} onClick={() => onOpen(d.day)}>
            <span className="hist-date">{formatDay(d.day, thisYear)}{flag(d)}</span>
            <span className="hist-avg">{avg(d)}</span>
            <span className="hist-sub">♥ {Math.round(d.pulse)} · {d.count}×</span>
            {d.readings.some((r) => r.note) && <span className="hist-icon"><NoteIcon /></span>}
          </button>
        </li>
      ))}
    </ul>
  )
}
