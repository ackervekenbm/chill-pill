// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useEffect, useState } from 'react'
import { TodayCard } from './components/TodayCard'
import { TrendCard } from './components/TrendCard'
import { Shell, useIsDesktop, type View } from './components/Shell'
import { applyTheme } from './theme'
import { useData } from './useData'
import { useNow } from './useNow'

export function App() {
  const data = useData()
  const desktop = useIsDesktop()
  const [view, setView] = useState<View>('today')
  const theme = data.settings.theme
  const todayDate = useNow().slice(0, 10)

  useEffect(() => applyTheme(theme), [theme])

  if (data.loading && data.readings.length === 0 && !data.error) {
    return <div className="state" role="status">Loading…</div>
  }
  if (data.error) {
    return (
      <div className="state" role="alert">
        <h1>Couldn't load your readings</h1>
        <p>Check your connection and try again. Nothing has been lost.</p>
        <button type="button" className="btn-primary" onClick={() => void data.reload()}>Try again</button>
      </div>
    )
  }

  const today = <TodayCard readings={data.readings} onAdd={data.addReading} onUndo={data.removeReading} />
  const trend = <TrendCard readings={data.readings} medications={data.medications} settings={data.settings} today={todayDate} />
  const panel = (name: string) => <section className="card" aria-label={name}><h2 className="card-title">{name}</h2></section>
  let body
  if (view === 'settings') body = panel('Settings')
  else if (desktop) {
    body = (
      <div className="desk-grid">
        <div className="col">{today}{panel('Medication')}</div>
        <div className="col">{trend}{panel('History')}</div>
      </div>
    )
  } else if (view === 'today') body = <>{today}{trend}</>
  else body = panel(view === 'history' ? 'History' : 'Medication')

  return <Shell view={view} onView={setView}>{body}</Shell>
}
