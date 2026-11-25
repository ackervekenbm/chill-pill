// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Medication, NewMedication } from '../../shared/types'
import { useNow } from '../useNow'
import { formatDay } from './HistoryList'
import { UndoToast } from './UndoToast'

interface Props {
  medications: Medication[] // ascending by date
  onAdd: (m: NewMedication) => Promise<unknown>
  onUpdate: (id: number, patch: NewMedication) => Promise<unknown>
  onDelete: (id: number) => Promise<unknown>
}

const msg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

/** Medication card: dated labels (shown as markers on the chart), add form, inline edit, delete with undo. */
export function MedicationList({ medications, onAdd, onUpdate, onDelete }: Props) {
  const now = useNow()
  const today = now.slice(0, 10)
  const thisYear = now.slice(0, 4)
  const [picked, setDate] = useState<string | null>(null) // null = follow today, so a PWA left open past midnight doesn't keep yesterday
  const date = picked ?? today
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: number; date: string; label: string } | null>(null)
  const [deleted, setDeleted] = useState<{ m: Medication; n: number } | null>(null)
  const root = useRef<HTMLElement>(null)
  const back = useRef<number | 'heading' | null>(null) // where focus goes after an edit closes or a row goes away
  useEffect(() => {
    if (editing || back.current === null) return
    const el = back.current === 'heading' ? root.current?.querySelector('h2') : root.current?.querySelector(`[data-edit="${back.current}"]`)
    ;(el as HTMLElement | null)?.focus()
    back.current = null
  }, [editing, medications])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const l = label.trim()
    if (busy) return
    if (!l) return setError('Enter a label, for example "Started Examplol 5 mg"')
    if (!date) return setError('Pick a date')
    setBusy(true)
    setError(null)
    try {
      await onAdd({ date, label: l })
      setLabel('')
      setDate(null)
    } catch (err) {
      setError(`Couldn't add: ${msg(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!editing || busy) return
    const l = editing.label.trim()
    if (!l || !editing.date) return setError('A date and a label are required')
    setBusy(true)
    setError(null)
    try {
      await onUpdate(editing.id, { date: editing.date, label: l })
      back.current = editing.id
      setEditing(null)
    } catch (err) {
      setError(`Couldn't save: ${msg(err)}`) // stay in edit mode with the typed values
    } finally {
      setBusy(false)
    }
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); void save() }
    else if (e.key === 'Escape') { back.current = editing?.id ?? null; setError(null); setEditing(null) }
  }

  const remove = async (m: Medication) => {
    setError(null)
    try {
      await onDelete(m.id)
      back.current = 'heading'
      setDeleted((d) => ({ m, n: (d?.n ?? 0) + 1 }))
    } catch (err) {
      setError(`Couldn't delete: ${msg(err)}`)
    }
  }
  const undo = async () => {
    if (!deleted) return
    const { date: d, label: l } = deleted.m
    setDeleted(null)
    try {
      await onAdd({ date: d, label: l })
    } catch (err) {
      setError(`Couldn't restore: ${msg(err)}`)
    }
  }

  const newest = [...medications].reverse()
  return (
    <section className="card meds" aria-label="Medication" ref={root}>
      <h2 className="card-title" tabIndex={-1}>Medication</h2>
      <p className="muted">Changes show as markers on the trend chart.</p>
      <form className="med-add" onSubmit={(e) => void add(e)} noValidate>
        <label className="fld grow">
          <span>Label</span>
          <input className="field" value={label} maxLength={120} placeholder="Started Examplol 5 mg" onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className="fld">
          <span>Date</span>
          <input className="field" type="date" value={date} max="9999-12-31" onChange={(e) => setDate(e.target.value)} />
        </label>
        <button type="submit" className="btn-primary" disabled={busy}>Add</button>
      </form>
      {error && <div className="banner-err" role="alert">{error}</div>}
      {newest.length === 0 ? (
        <p className="hist-empty">No medication changes yet</p>
      ) : (
        <ul className="med-list">
          {newest.map((m) =>
            editing?.id === m.id ? (
              <li key={m.id} className="med-row editing" onKeyDown={onKey}>
                <input className="field" type="date" aria-label="Edit date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
                <input className="field grow" aria-label="Edit label" maxLength={120} value={editing.label} autoFocus onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
                <button type="button" className="link-btn" disabled={busy} onClick={() => void save()}>Save</button>
                <button type="button" className="link-btn" onClick={() => { back.current = m.id; setError(null); setEditing(null) }}>Cancel</button>
              </li>
            ) : (
              <li key={m.id} className="med-row">
                <span className="med-dot" aria-hidden="true" />
                <div className="med-text">
                  <span className="med-label">{m.label}</span>
                  <span className="med-date">{formatDay(m.date, thisYear)}</span>
                </div>
                <button type="button" className="link-btn" data-edit={m.id} aria-label={`Edit ${m.label}`} onClick={() => { setError(null); setEditing({ id: m.id, date: m.date, label: m.label }) }}>Edit</button>
                <button type="button" className="link-btn danger" aria-label={`Delete ${m.label}`} onClick={() => void remove(m)}>Delete</button>
              </li>
            ),
          )}
        </ul>
      )}
      {deleted && <UndoToast key={deleted.n} message="Medication deleted" onUndo={() => void undo()} onDone={() => setDeleted(null)} />}
    </section>
  )
}
