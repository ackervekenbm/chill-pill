// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useEffect, useState, type ReactNode } from 'react'
import { HistoryIcon, MedicationIcon, SettingsIcon, TodayIcon } from './icons'

export type View = 'today' | 'history' | 'medication' | 'settings'

const TABS: { view: View; label: string; Icon: () => ReactNode }[] = [
  { view: 'today', label: 'Today', Icon: TodayIcon },
  { view: 'history', label: 'History', Icon: HistoryIcon },
  { view: 'medication', label: 'Medication', Icon: MedicationIcon },
  { view: 'settings', label: 'Settings', Icon: SettingsIcon },
]

const QUERY = '(min-width: 900px)'
const match = () => typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches

/** True at desktop width; the CSS breakpoint and this one must agree (900px). */
export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(match)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(QUERY)
    const on = () => setDesktop(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return desktop
}

interface Props {
  view: View
  onView: (v: View) => void
  children: ReactNode
}

/**
 * Phone: content above a bottom tab bar (Today, History, Medication, Settings).
 * Desktop: a top bar with Today and Settings; History and Medication are
 * panels of the Today grid, so `view` is shown as Today unless it is Settings.
 */
export function Shell({ view, onView, children }: Props) {
  const desktop = useIsDesktop()
  const tabs = desktop ? TABS.filter((t) => t.view === 'today' || t.view === 'settings') : TABS
  const active: View = desktop && view !== 'settings' ? 'today' : view
  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true"><TodayIcon /></span>
          Chill Pill
        </span>
      </header>
      <nav className="tabs" aria-label="Main">
        {tabs.map(({ view: v, label, Icon }) => (
          <button key={v} type="button" className="tab" aria-current={v === active ? 'page' : undefined} onClick={() => onView(v)}>
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <main className="content">{children}</main>
    </div>
  )
}
