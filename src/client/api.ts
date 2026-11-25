// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import type { Medication, NewMedication, NewReading, Reading, ReadingPatch, Settings } from '../shared/types'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public field?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; field?: string } | null
    throw new ApiError(res.status, body?.error ?? `request failed (${res.status})`, body?.field)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const exportUrl = '/api/export.csv'

export const getReadings = (): Promise<Reading[]> => req('/api/readings')
export const addReading = (r: NewReading): Promise<Reading> => req('/api/readings', json('POST', r))
export const patchReading = (id: number, p: ReadingPatch): Promise<Reading> => req(`/api/readings/${id}`, json('PATCH', p))
export const deleteReading = (id: number): Promise<void> => req(`/api/readings/${id}`, { method: 'DELETE' })

export const getMedications = (): Promise<Medication[]> => req('/api/medications')
export const addMedication = (m: NewMedication): Promise<Medication> => req('/api/medications', json('POST', m))
export const patchMedication = (id: number, p: Partial<NewMedication>): Promise<Medication> =>
  req(`/api/medications/${id}`, json('PATCH', p))
export const deleteMedication = (id: number): Promise<void> => req(`/api/medications/${id}`, { method: 'DELETE' })

export const getSettings = (): Promise<Settings> => req('/api/settings')
export const putSettings = (s: Settings): Promise<Settings> => req('/api/settings', json('PUT', s))
