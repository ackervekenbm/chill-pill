// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useCallback, useEffect, useState } from 'react'
import type { Medication, NewMedication, NewReading, Reading, ReadingPatch, Settings } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'
import * as api from './api'

const byTime = (a: Reading, b: Reading) => a.takenAt.localeCompare(b.takenAt) || a.id - b.id
const byDate = (a: Medication, b: Medication) => a.date.localeCompare(b.date) || a.id - b.id

/**
 * The only place that talks to api.ts. Mutations reject on failure (callers
 * keep their typed values and show the error) and patch local state from the
 * server's answer instead of refetching.
 */
export function useData() {
  const [readings, setReadings] = useState<Reading[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [r, m, s] = await Promise.all([api.getReadings(), api.getMedications(), api.getSettings()])
      setReadings(r)
      setMedications(m)
      setSettings(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'could not load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    void reload()
  }, [reload])

  const addReading = async (r: NewReading) => {
    const created = await api.addReading(r)
    setReadings((all) => [...all, created].sort(byTime))
    return created
  }
  const updateReading = async (id: number, p: ReadingPatch) => {
    const updated = await api.patchReading(id, p)
    setReadings((all) => all.map((x) => (x.id === id ? updated : x)).sort(byTime))
    return updated
  }
  const removeReading = async (id: number) => {
    await api.deleteReading(id)
    setReadings((all) => all.filter((x) => x.id !== id))
  }
  const addMedication = async (m: NewMedication) => {
    const created = await api.addMedication(m)
    setMedications((all) => [...all, created].sort(byDate))
    return created
  }
  const updateMedication = async (id: number, p: Partial<NewMedication>) => {
    const updated = await api.patchMedication(id, p)
    setMedications((all) => all.map((x) => (x.id === id ? updated : x)).sort(byDate))
    return updated
  }
  const removeMedication = async (id: number) => {
    await api.deleteMedication(id)
    setMedications((all) => all.filter((x) => x.id !== id))
  }
  const saveSettings = async (s: Settings) => {
    const saved = await api.putSettings(s)
    setSettings(saved)
    return saved
  }

  return {
    readings, medications, settings, loading, error,
    addReading, updateReading, removeReading,
    addMedication, updateMedication, removeMedication,
    saveSettings, reload,
  }
}

export type Data = ReturnType<typeof useData>
