// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { z } from 'zod'
import { THEME_IDS } from './types'

export const LIMITS = {
  sys: { min: 60, max: 260 },
  dia: { min: 30, max: 160 },
  pulse: { min: 30, max: 220 },
  note: 280,
  label: 120,
} as const

const int = (k: 'sys' | 'dia' | 'pulse') => z.number().int().min(LIMITS[k].min).max(LIMITS[k].max)

const validDate = (s: string) => {
  const d = new Date(`${s.slice(0, 10)}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s.slice(0, 10)
}
const takenAt = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T([01]\d|2[0-3]):[0-5]\d)?$/)
  .refine(validDate, 'Invalid date')
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(validDate, 'Invalid date')

const note = z.string().trim().max(LIMITS.note).transform((s) => s || null).nullable().optional()
const label = z.string().trim().min(1).max(LIMITS.label)

const readingBase = z.object({ takenAt, sys: int('sys'), dia: int('dia'), pulse: int('pulse'), note })

const sysOverDia = (v: { sys?: number; dia?: number }) => v.sys === undefined || v.dia === undefined || v.sys > v.dia
const sysOverDiaMsg = { message: 'Systolic must be higher than diastolic', path: ['dia'] }

export const newReadingSchema = readingBase.refine(sysOverDia, sysOverDiaMsg)
export const readingPatchSchema = readingBase.partial().refine(sysOverDia, sysOverDiaMsg)

export const newMedicationSchema = z.object({ date: day, label })
export const medicationPatchSchema = newMedicationSchema.partial()

export const settingsSchema = z.object({
  theme: z.enum(THEME_IDS),
  targetSys: int('sys'),
  targetDia: int('dia'),
})

export const importSchema = z.array(newReadingSchema).max(5000)

/** Inline client message for one field: null while empty or valid. */
export function fieldError(field: 'sys' | 'dia' | 'pulse', text: string): string | null {
  const t = text.trim()
  if (t === '') return null
  if (!/^\d+$/.test(t)) return 'Numbers only'
  const { min, max } = LIMITS[field]
  const n = Number(t)
  return n < min || n > max ? `Enter ${min}-${max}` : null
}
