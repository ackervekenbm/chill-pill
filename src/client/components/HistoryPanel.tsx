// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useEffect, useMemo, useRef, useState } from 'react'
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
  const root = useRef<HTMLElement>(null)
  const returnTo = useRef<string | null>(null)
  const [failed, setFailed] = useState<Reading | null>(null)
  const day = open ? days.find((d) => d.day === open) : undefined // an emptied day falls back to the list
  if (open && !day) {
    returnTo.current ??= '' // no row to return to; the effect below focuses the heading
    setOpen(null)
  }

  const remove = async (r: Reading) => {
    setError(null)
    try {
      await onRemove(r.id)
      setDeleted((d) => ({ r, n: (d?.n ?? 0) + 1 }))
    } catch (e) {
      setError(`Couldn't delete: ${(e as Error).message}`)
    }
  }
  // Back (or an emptied day) lands on the list: return focus to that day's row, else the card heading.
  useEffect(() => {
    if (day) return
    const sel = returnTo.current && `[data-day="${returnTo.current}"]`
    const el = (sel && root.current?.querySelector<HTMLElement>(sel)) || null
    if (el) el.focus()
    else if (returnTo.current !== null) root.current?.querySelector<HTMLElement>('h2')?.focus()
    returnTo.current = null
  }, [day])

  const restore = async (r: Reading) => {
    const { takenAt, sys, dia, pulse, note } = r
    setFailed(null)
    setError(null)
    try {
      await onAdd({ takenAt, sys, dia, pulse, note })
    } catch {
      setFailed(r) // keep the values so Retry can try again
    }
  }
  const undo = async () => {
    if (!deleted) return
    const r = deleted.r
    setDeleted(null)
    await restore(r)
  }

  return (
    <section className="card history" aria-label="History" ref={root}>
      <h2 className="card-title" tabIndex={-1}>History</h2>
      {error && <div className="banner-err" role="alert">{error}</div>}
      {failed && (
        <div className="banner-err" role="alert">
          Couldn't restore the reading.{' '}
          <button type="button" className="link-btn" onClick={() => void restore(failed)}>Retry</button>
          <button type="button" className="link-btn" onClick={() => setFailed(null)}>Dismiss</button>
        </div>
      )}
      {day ? (
        <DayDetail day={day} onEdit={onUpdate} onDelete={(r) => void remove(r)} onClose={() => { returnTo.current = open; setOpen(null) }} />
      ) : (
        <HistoryList days={days} settings={settings} onOpen={setOpen} />
      )}
      {deleted && <UndoToast key={deleted.n} message="Reading deleted" onUndo={() => void undo()} onDone={() => setDeleted(null)} />}
    </section>
  )
}
