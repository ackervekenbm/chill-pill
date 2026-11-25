// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useEffect, useRef, useState } from 'react'
import type { DayAverage, NewReading, Reading } from '../../shared/types'
import { useNow } from '../useNow'
import { formatDay } from './HistoryList'
import { ReadingEditor } from './ReadingEditor'

interface Props {
  day: DayAverage
  onEdit: (id: number, patch: NewReading) => Promise<unknown>
  onDelete: (r: Reading) => void
  onClose: () => void
}

export function DayDetail({ day, onEdit, onDelete, onClose }: Props) {
  const thisYear = useNow().slice(0, 4)
  const [editing, setEditing] = useState<number | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const back = useRef<number | 'heading' | null>('heading') // where focus goes once the editor closes
  useEffect(() => {
    if (editing !== null) return
    if (back.current === 'heading' || back.current === null) heading.current?.focus()
    else list.current?.querySelector<HTMLElement>(`[data-edit="${back.current}"]`)?.focus()
    back.current = null
  }, [editing])
  const close = (id: number) => { back.current = id; setEditing(null) }
  return (
    <div className="day-detail">
      <button type="button" className="link-btn" onClick={onClose}>← Back to history</button>
      <h3 className="day-title" ref={heading} tabIndex={-1}>{formatDay(day.day, thisYear)}</h3>
      <div className="label">Average of {day.count} · {Math.round(day.sys)}/{Math.round(day.dia)} · pulse {Math.round(day.pulse)}</div>
      <ul className="day-readings" ref={list}>
        {day.readings.map((r) =>
          editing === r.id ? (
            <li key={r.id}>
              <ReadingEditor
                reading={r}
                onCancel={() => close(r.id)}
                onSave={async (patch) => { await onEdit(r.id, patch); close(r.id) }}
              />
            </li>
          ) : (
            <li key={r.id} className="day-reading">
              <span className="day-time">{r.takenAt.length > 10 ? r.takenAt.slice(11, 16) : '—'}</span>
              <span className="day-bp">{r.sys}/{r.dia} <small>♥ {r.pulse}</small></span>
              {r.note && <span className="day-note">{r.note}</span>}
              <span className="day-actions">
                <button type="button" className="link-btn" data-edit={r.id} onClick={() => setEditing(r.id)}>Edit</button>
                <button type="button" className="link-btn danger" onClick={() => { heading.current?.focus(); onDelete(r) }}>Delete</button>
              </span>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}
