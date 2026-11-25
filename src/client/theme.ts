// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { THEME_IDS, type ThemeId } from '../shared/types'

export interface ThemeMeta {
  id: ThemeId
  label: string
  bg: string
  accent: string
}

export const THEMES: ThemeMeta[] = [
  { id: 'calm', label: 'Clinical calm', bg: '#f4f6f8', accent: '#0f9488' },
  { id: 'dashboard', label: 'Dark dashboard', bg: '#0b1020', accent: '#ff8a7a' },
  { id: 'editorial', label: 'Warm editorial', bg: '#f6f1ea', accent: '#c2593c' },
]

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value)
}

export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  const theme = THEMES.find((t) => t.id === id)
  if (meta && theme) meta.setAttribute('content', theme.bg)
}
