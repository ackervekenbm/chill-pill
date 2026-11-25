// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useMemo, useState } from 'react'
import type { NewReading, Reading, ReadingPatch, Settings } from '../../shared/types'
import { dayAverages } from '../../shared/stats'
import { DayDetail } from './DayDetail'
import { HistoryList } from './HistoryList'
import { UndoToast } from './UndoToast'

interface Props {
  readings: Reading[]
  settings: Settings
  onAdd: (r: NewReading) => Promise<Reading>
  onUpdate: (id: number, p: ReadingPatch) => Promise<Reading>
  onRemove: (id: number) => Promise<void>
}

/** History card: the day list, a day's detail, and the delete-with-undo toast (which must outlive an emptied day). */
export function HistoryPanel({ readings, settings, onAdd, onUpdate, onRemove }: Props) {
  const days = useMemo(() => dayAverages(readings), [readings])
  const [open, setOpen] = useState<string | null>(null)
  const [deleted, setDeleted] = useState<{ r: Reading; n: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const day = open ? days.find((d) => d.day === open) : undefined // an emptied day falls back to the list

  const remove = async (r: Reading) => {
    setError(null)
    try {
      await onRemove(r.id)
      setDeleted((d) => ({ r, n: (d?.n ?? 0) + 1 }))
    } catch (e) {
      setError(`Couldn't delete: ${(e as Error).message}`)
    }
  }
  const undo = async () => {
    if (!deleted) return
    const { takenAt, sys, dia, pulse, note } = deleted.r
    setDeleted(null)
    try {
      await onAdd({ takenAt, sys, dia, pulse, note })
    } catch (e) {
      setError(`Couldn't restore: ${(e as Error).message}`)
    }
  }

  return (
    <section className="card history" aria-label="History">
      <h2 className="card-title">History</h2>
      {error && <div className="banner-err" role="alert">{error}</div>}
      {day ? (
        <DayDetail day={day} onEdit={onUpdate} onDelete={(r) => void remove(r)} onClose={() => setOpen(null)} />
      ) : (
        <HistoryList days={days} settings={settings} onOpen={setOpen} />
      )}
      {deleted && <UndoToast key={deleted.n} message="Reading deleted" onUndo={() => void undo()} onDone={() => setDeleted(null)} />}
    </section>
  )
}
