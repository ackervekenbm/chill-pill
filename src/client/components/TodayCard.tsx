// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { NewReading, Reading } from '../../shared/types'
import { nowLocal } from '../../shared/dates'
import { dayAverages, shouldAdvance } from '../../shared/stats'
import { fieldError, newReadingSchema } from '../../shared/validation'
import { UndoToast } from './UndoToast'

interface Props {
  readings: Reading[]
  onAdd: (r: NewReading) => Promise<Reading>
  onUndo: (id: number) => Promise<void>
}

type Field = 'sys' | 'dia' | 'pulse'
const FIELDS: Array<{ key: Field; label: string; hint: 'next' | 'done' }> = [
  { key: 'sys', label: 'SYS', hint: 'next' },
  { key: 'dia', label: 'DIA', hint: 'next' },
  { key: 'pulse', label: 'PULSE', hint: 'done' },
]

export function TodayCard({ readings, onAdd, onUndo }: Props) {
  const [now, setNow] = useState(() => nowLocal())
  const [text, setText] = useState<Record<Field, string>>({ sys: '', dia: '', pulse: '' })
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [picked, setPicked] = useState<string | null>(null) // null = follow the clock
  const [blurred, setBlurred] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [saved, setSaved] = useState<{ id: number; n: number } | null>(null)
  const refs = useRef<Record<Field, HTMLInputElement | null>>({ sys: null, dia: null, pulse: null })
  const inFlight = useRef(false)

  // The PWA can stay open overnight: keep "now" (and so "today") fresh.
  useEffect(() => {
    const tick = () => setNow(nowLocal())
    const id = setInterval(tick, 30_000)
    const onVis = () => document.visibilityState === 'visible' && tick()
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const today = now.slice(0, 10)
  const day = useMemo(() => dayAverages(readings.filter((r) => r.takenAt.startsWith(today)))[0], [readings, today])
  const count = day?.count ?? 0
  const takenAt = picked ?? now

  // Range errors wait until the value could be complete (or the field is left), so typing '1' doesn't flash red.
  const liveErr = (f: Field) => (blurred[f] || shouldAdvance(f, text[f]) ? fieldError(f, text[f]) : null)
  const fieldErr = (f: Field) => errors[f] ?? liveErr(f)
  const complete = FIELDS.every((f) => text[f.key].trim() !== '' && !fieldError(f.key, text[f.key]))
  const parsed = complete
    ? newReadingSchema.safeParse({ takenAt, sys: Number(text.sys), dia: Number(text.dia), pulse: Number(text.pulse), note })
    : null
  const diaMsg = errors.dia ?? liveErr('dia') ?? parsed?.error?.issues.find((i) => i.path[0] === 'dia')?.message ?? null
  const valid = !!parsed?.success

  const edit = (f: Field, v: string) => {
    setText((t) => ({ ...t, [f]: v }))
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== f)))
    const i = FIELDS.findIndex((x) => x.key === f)
    if (v && !fieldError(f, v) && shouldAdvance(f, v) && i < 2) {
      const el = refs.current[FIELDS[i + 1].key]
      el?.focus()
      el?.select()
    }
  }

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!parsed?.success || inFlight.current) return
      inFlight.current = true
      setSaving(true)
      setBanner(null)
      setErrors({})
      try {
        const r = await onAdd(parsed.data)
        setText({ sys: '', dia: '', pulse: '' })
        setNote('')
        setNoteOpen(false)
        setPicked(null)
        setSaved({ id: r.id, n: r.takenAt.startsWith(today) ? count + 1 : count })
        refs.current.sys?.focus()
      } catch (err) {
        const { field, message } = err as { field?: string; message?: string }
        if (field) setErrors({ [field]: message ?? 'Invalid value' })
        else setBanner(message ?? 'Could not save. Try again.')
      } finally {
        inFlight.current = false
        setSaving(false)
      }
    },
    [parsed, onAdd, today, count],
  )

  const undo = async () => {
    if (!saved) return
    const { id } = saved
    setSaved(null)
    try {
      await onUndo(id)
    } catch (err) {
      setBanner(`Couldn't undo: ${(err as Error).message}`)
    }
  }

  const t = takenAt.slice(11, 16) || '--:--'
  const timeLabel = takenAt.startsWith(today) ? t : `${takenAt.slice(8, 10)}/${takenAt.slice(5, 7)} ${t}`

  return (
    <section className="card today" aria-label="Today">
      <div className="today-head">
        <div>
          <div className="label">Today{count > 0 ? ` · avg of ${count}` : ''}</div>
          {day ? (
            <div className="big" aria-label="Today's average">{Math.round(day.sys)}<span className="slash">/</span>{Math.round(day.dia)}</div>
          ) : (
            <p className="today-hint">Your first reading of the day goes here</p>
          )}
        </div>
        <div className="dots" aria-hidden="true">
          {Array.from({ length: Math.max(3, count) }, (_, i) => <i key={i} className={i < count ? '' : 'off'} />)}
        </div>
      </div>

      <form onSubmit={(e) => void submit(e)} noValidate>
        <div className="inputs">
          {FIELDS.map((f, i) => (
            <div key={f.key} className="in-wrap">
              <input
                ref={(el) => { refs.current[f.key] = el }}
                id={`today-${f.key}`}
                className="in-box"
                inputMode="numeric"
                enterKeyHint={f.hint}
                autoComplete="off"
                autoFocus={i === 0}
                maxLength={3}
                placeholder="–"
                aria-label={f.label}
                aria-invalid={!!(f.key === 'dia' ? diaMsg : fieldErr(f.key))}
                aria-describedby={`today-${f.key}-err`}
                value={text[f.key]}
                onChange={(e) => edit(f.key, e.target.value)}
                onBlur={() => setBlurred((b) => ({ ...b, [f.key]: true }))}
              />
              <label htmlFor={`today-${f.key}`} className="label">{f.label}</label>
              <div id={`today-${f.key}-err`} className="field-err">{f.key === 'dia' ? diaMsg : fieldErr(f.key)}</div>
            </div>
          ))}
        </div>

        <div className="today-meta">
          <button type="button" className="link-btn" aria-expanded={noteOpen} onClick={() => setNoteOpen((o) => !o)}>
            {noteOpen ? '− note' : '+ note'}
          </button>
          <label className="time-chip chip">
            <span aria-hidden="true">{timeLabel} ✎</span>
            <input
              type="datetime-local"
              aria-label="Time taken"
              max={now}
              value={takenAt}
              onChange={(e) => setPicked(e.target.value || null)}
            />
          </label>
        </div>
        {errors.takenAt && <div className="field-err">{errors.takenAt}</div>}
        {noteOpen && (
          <>
            <textarea className="note-box" aria-label="Note" rows={2} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} />
            {errors.note && <div className="field-err">{errors.note}</div>}
          </>
        )}

        {banner && <div className="banner-err" role="alert">{banner}</div>}
        <button type="submit" className="btn-primary save" disabled={!valid || saving}>
          {saving ? 'Saving…' : `Save reading ${count + 1}`}
        </button>
      </form>

      {saved && (
        <UndoToast key={saved.id} message={`Saved reading ${saved.n}`} onUndo={() => void undo()} onDone={() => setSaved(null)} />
      )}
    </section>
  )
}
