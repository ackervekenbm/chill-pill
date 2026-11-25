// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import type { ReactNode } from 'react'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

export const TodayIcon = () => (
  <Icon>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
    <path d="M7.5 12h2.2l1.2-2.2 2 4 1.2-1.8h2.4" />
  </Icon>
)
export const HistoryIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
)
export const MedicationIcon = () => (
  <Icon>
    <rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-35 12 12)" />
    <path d="m9.2 7.2 5.6 8" />
  </Icon>
)
export const SettingsIcon = () => (
  <Icon>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Icon>
)
export const NoteIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="has a note">
    <path d="M5 4h14v12l-4 4H5z" />
    <path d="M15 20v-4h4M8 9h8M8 13h4" />
  </svg>
)

// Brand mark: keep in sync with scripts/gen-icons.mjs.
export const Logo = () => (
  <svg viewBox="72 72 368 368" width="32" height="32" aria-hidden="true" focusable="false">
    <g transform="rotate(-35 256 256)">
      <path d="M256 186H162a70 70 0 0 0 0 140H256Z" fill="#0f9488" />
      <path d="M256 186H350a70 70 0 0 1 0 140H256Z" fill="#ffffff" />
      <rect x="92" y="186" width="328" height="140" rx="70" fill="none" stroke="#0f9488" strokeWidth="16" />
      <path d="M132 256H206L232 206L272 306L300 236L316 256H380" fill="none" stroke="#e8505b" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
)
