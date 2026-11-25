// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { beforeAfter } from '../../shared/stats'
import type { BeforeAfter, DayAverage, Medication, WindowAverage } from '../../shared/types'
import { bp, daysText } from './SummaryStrip'
import { shortDate } from './TrendChart'

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')

function Side({ title, w }: { title: string; w: WindowAverage | null }) {
  return (
    <div className="ba-side">
      <span className="label">{title}</span>
      <b className={w ? 'ba-num' : 'ba-num ba-none'}>{w ? bp(w) : 'no data'}</b>
      {w && <span className="ba-sub">{daysText(w.days)}</span>}
    </div>
  )
}

/** Difference of the displayed (rounded) numbers, so the three figures always add up. */
export const diffText = ({ before, after }: BeforeAfter) =>
  before && after ? `${signed(Math.round(after.sys) - Math.round(before.sys))}/${signed(Math.round(after.dia) - Math.round(before.dia))}` : null

export function BeforeAfterCard({ medication, days, onClose }: { medication: Medication; days: DayAverage[]; onClose: () => void }) {
  const ba = beforeAfter(days, medication.date)
  const { before, after } = ba
  const diff = diffText(ba)
  return (
    <section className="ba" aria-label={`Before and after: ${medication.label}`}>
      <div className="ba-head">
        <div>
          <span className="label">💊 {shortDate(medication.date)}</span>
          <h3 className="ba-title">{medication.label}</h3>
          <p className="ba-hint">Day averages, 30 days before vs. the 30 days from this date</p>
        </div>
        <button type="button" className="ba-close" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className="ba-grid">
        <Side title="Before" w={before} />
        <Side title="After" w={after} />
        <div className="ba-side">
          <span className="label">Change</span>
          <b className={diff ? 'ba-num' : 'ba-num ba-none'}>{diff ?? '—'}</b>
        </div>
      </div>
    </section>
  )
}
