// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { beforeEach, expect, it } from 'vitest'
import { THEME_IDS } from '../shared/types'
import { applyTheme, isThemeId, THEMES } from './theme'

beforeEach(() => {
  document.head.innerHTML = '<meta name="theme-color" content="#000000">'
})

it('applyTheme sets data-theme and the browser chrome colour', () => {
  applyTheme('editorial')
  expect(document.documentElement.dataset.theme).toBe('editorial')
  expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#f6f1ea')
})

it('THEMES covers exactly THEME_IDS', () => {
  expect(THEMES.map((t) => t.id)).toEqual([...THEME_IDS])
  expect(isThemeId('calm')).toBe(true)
  expect(isThemeId('neon')).toBe(false)
})
