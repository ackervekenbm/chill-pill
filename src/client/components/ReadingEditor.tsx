// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useRef, useState } from 'react'
import type { NewReading, Reading } from '../../shared/types'
import { nowLocal } from '../../shared/dates'
import { checkReading, ReadingFields, type Field } from './ReadingFields'

interface Props {
  reading: Reading
  onSave: (patch: NewReading) => Promise<unknown>
  onCancel: () => void
}

/** Edits one reading in place; same validation as the Today card. A date-only reading stays date-only unless a time is chosen. */
export function ReadingEditor({ reading, onSave, onCancel }: Props) {
  const [text, setText] = useState<Record<Field, string>>({ sys: String(reading.sys), dia: String(reading.dia), pulse: String(reading.pulse) })
  const [date, setDate] = useState(reading.takenAt.slice(0, 10))
  const [time, setTime] = useState(reading.takenAt.slice(11, 16))
  const [note, setNote] = useState(reading.note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const inFlight = useRef(false)
  const timed = reading.takenAt.length > 10 // a timed reading keeps a time; only a date-only one may stay without

  const takenAt = time ? `${date}T${time}` : date
  const { parsed: checked, diaExtra } = checkReading(text, takenAt, note)
  const parsed = timed && !time ? null : checked
  const clear = (k: string) => setErrors((e) => Object.fromEntries(Object.entries(e).filter(([x]) => x !== k)))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parsed?.success || inFlight.current) return
    inFlight.current = true
    setSaving(true)
    setBanner(null)
    setErrors({})
    try {
      await onSave(parsed.data)
    } catch (err) {
      const { field, message } = err as { field?: string; message?: string }
      if (field) setErrors({ [field]: message ?? 'Invalid value' })
      else setBanner(message ?? 'Could not save. Try again.')
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return (
    <form className="editor" onSubmit={(e) => void submit(e)} noValidate aria-label="Edit reading">
      <ReadingFields
        idPrefix={`edit-${reading.id}`}
        text={text}
        onChange={(f, v) => { setText((t) => ({ ...t, [f]: v })); clear(f) }}
        errors={errors}
        diaExtra={diaExtra}
        autoFocus
      />
      <div className="editor-when">
        <label>
          <span className="label">Date</span>
          <input type="date" className="field" aria-label="Date" max={nowLocal().slice(0, 10)} value={date} onChange={(e) => { setDate(e.target.value); clear('takenAt') }} />
        </label>
        <label>
          <span className="label">{timed ? 'Time' : 'Time (optional)'}</span>
          <input type="time" className="field" aria-label="Time" max={date === nowLocal().slice(0, 10) ? nowLocal().slice(11, 16) : undefined} value={time} onChange={(e) => { setTime(e.target.value); clear('takenAt') }} />
        </label>
      </div>
      {timed && !time && <div className="field-err">Time required</div>}
      {errors.takenAt && <div className="field-err">{errors.takenAt}</div>}
      <textarea className="note-box" aria-label="Note" rows={2} maxLength={280} placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
      {errors.note && <div className="field-err">{errors.note}</div>}
      {banner && <div className="banner-err" role="alert">{banner}</div>}
      <div className="editor-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={!parsed?.success || saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}
