// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

export const THEME_IDS = ['calm', 'dashboard', 'editorial'] as const
export type ThemeId = (typeof THEME_IDS)[number]

export interface Reading {
  id: number
  takenAt: string
  sys: number
  dia: number
  pulse: number
  note: string | null
  createdAt: string
}
export interface NewReading {
  takenAt: string
  sys: number
  dia: number
  pulse: number
  note?: string | null
}
export type ReadingPatch = Partial<NewReading>

export interface Medication {
  id: number
  date: string
  label: string
  createdAt: string
}
export interface NewMedication {
  date: string
  label: string
}

export interface Settings {
  theme: ThemeId
  targetSys: number
  targetDia: number
}
export const DEFAULT_SETTINGS: Settings = { theme: 'calm', targetSys: 135, targetDia: 85 }

export type Period = 'all' | 'morning' | 'evening'
export type RangeId = '1M' | '3M' | '6M' | '1Y' | 'All'

/** Unrounded means; rounding is a display concern. */
export interface DayAverage {
  day: string
  sys: number
  dia: number
  pulse: number
  count: number
  readings: Reading[]
}
export interface WindowAverage {
  sys: number
  dia: number
  pulse: number
  days: number
}
export interface RangeSummary extends WindowAverage {
  onTargetShare: number
}
export interface BeforeAfter {
  before: WindowAverage | null
  after: WindowAverage | null
}
export interface ImportResult {
  inserted: number
  skipped: number
}
