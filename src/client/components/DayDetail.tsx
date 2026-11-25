// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useState } from 'react'
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
  return (
    <div className="day-detail">
      <button type="button" className="link-btn" onClick={onClose}>← Back to history</button>
      <h3 className="day-title">{formatDay(day.day, thisYear)}</h3>
      <div className="label">Average of {day.count} · {Math.round(day.sys)}/{Math.round(day.dia)} · pulse {Math.round(day.pulse)}</div>
      <ul className="day-readings">
        {day.readings.map((r) =>
          editing === r.id ? (
            <li key={r.id}>
              <ReadingEditor
                reading={r}
                onCancel={() => setEditing(null)}
                onSave={async (patch) => { await onEdit(r.id, patch); setEditing(null) }}
              />
            </li>
          ) : (
            <li key={r.id} className="day-reading">
              <span className="day-time">{r.takenAt.length > 10 ? r.takenAt.slice(11, 16) : '—'}</span>
              <span className="day-bp">{r.sys}/{r.dia} <small>♥ {r.pulse}</small></span>
              {r.note && <span className="day-note">{r.note}</span>}
              <span className="day-actions">
                <button type="button" className="link-btn" onClick={() => setEditing(r.id)}>Edit</button>
                <button type="button" className="link-btn danger" onClick={() => onDelete(r)}>Delete</button>
              </span>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}
