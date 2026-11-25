// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useMemo, useState } from 'react'
import { rangeStart } from '../../shared/dates'
import { dayAverages, inRange, summarize } from '../../shared/stats'
import type { Medication, Period, RangeId, Reading, Settings } from '../../shared/types'
import { BeforeAfterCard } from './BeforeAfterCard'
import { RangeChips } from './RangeChips'
import { SummaryStrip } from './SummaryStrip'
import { TrendChart } from './TrendChart'

const RANGES = (['1M', '3M', '6M', '1Y', 'All'] as const).map((value) => ({ value, label: value }))
const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'morning', label: 'Morning' },
  { value: 'evening', label: 'Evening' },
]

interface Props {
  readings: Reading[]
  medications: Medication[]
  settings: Settings
  today: string
}

export function TrendCard({ readings, medications, settings, today }: Props) {
  const [range, setRange] = useState<RangeId>('6M')
  const [period, setPeriod] = useState<Period>('all')
  const [showPulse, setShowPulse] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)
  const all = useMemo(() => dayAverages(readings, period), [readings, period])
  const from = rangeStart(range, today)
  const days = useMemo(() => inRange(all, from, today), [all, from, today])
  const open = medications.find((m) => m.id === openId)

  return (
    <section className="card trend" aria-label="Trend">
      <div className="trend-head">
        <h2 className="card-title">Trend</h2>
        <label className="switch">
          <input type="checkbox" role="switch" checked={showPulse} onChange={(e) => setShowPulse(e.target.checked)} />
          <span className="switch-track" aria-hidden="true" />
          Pulse
        </label>
      </div>
      <div className="trend-controls">
        <RangeChips label="Range" options={RANGES} value={range} onChange={setRange} />
        <RangeChips label="Period" options={PERIODS} value={period} onChange={setPeriod} />
      </div>
      <SummaryStrip summary={summarize(days, settings)} range={range} />
      <TrendChart
        days={days} medications={medications} settings={settings} from={from} to={today} showPulse={showPulse}
        openId={openId} onMedication={(m) => setOpenId((id) => (id === m.id ? null : m.id))}
      />
      {open && <BeforeAfterCard medication={open} days={all} onClose={() => setOpenId(null)} />}
    </section>
  )
}
