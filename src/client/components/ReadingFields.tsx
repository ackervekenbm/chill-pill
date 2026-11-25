// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useRef, useState, type Ref } from 'react'
import { shouldAdvance } from '../../shared/stats'
import { fieldError } from '../../shared/validation'

export type Field = 'sys' | 'dia' | 'pulse'
export const FIELDS: Array<{ key: Field; label: string; hint: 'next' | 'done' }> = [
  { key: 'sys', label: 'SYS', hint: 'next' },
  { key: 'dia', label: 'DIA', hint: 'next' },
  { key: 'pulse', label: 'PULSE', hint: 'done' },
]

interface Props {
  idPrefix: string
  text: Record<Field, string>
  onChange: (f: Field, v: string) => void
  /** Errors from the server, shown until the field is edited. */
  errors: Record<string, string>
  /** Cross-field message (sys > dia) shown under DIA. */
  diaExtra: string | null
  autoFocus?: boolean
  sysRef?: Ref<HTMLInputElement>
}

/** The SYS / DIA / PULSE boxes shared by the Today card and the history editor. */
export function ReadingFields({ idPrefix, text, onChange, errors, diaExtra, autoFocus, sysRef }: Props) {
  const [blurred, setBlurred] = useState<Record<string, boolean>>({})
  const refs = useRef<Record<Field, HTMLInputElement | null>>({ sys: null, dia: null, pulse: null })

  // Range errors wait until the value could be complete (or the field is left), so typing '1' doesn't flash red.
  const liveErr = (f: Field) => (blurred[f] || shouldAdvance(f, text[f]) ? fieldError(f, text[f]) : null)
  const msg = (f: Field) => (f === 'dia' ? (errors.dia ?? liveErr('dia') ?? diaExtra) : (errors[f] ?? liveErr(f)))

  const edit = (f: Field, v: string) => {
    onChange(f, v)
    const i = FIELDS.findIndex((x) => x.key === f)
    if (v && !fieldError(f, v) && shouldAdvance(f, v) && i < 2) {
      const el = refs.current[FIELDS[i + 1].key]
      el?.focus()
      el?.select()
    }
  }

  return (
    <div className="inputs">
      {FIELDS.map((f, i) => (
        <div key={f.key} className="in-wrap">
          <input
            ref={(el) => {
              refs.current[f.key] = el
              if (f.key !== 'sys' || !sysRef) return
              if (typeof sysRef === 'function') sysRef(el)
              else sysRef.current = el
            }}
            id={`${idPrefix}-${f.key}`}
            className="in-box"
            inputMode="numeric"
            enterKeyHint={f.hint}
            autoComplete="off"
            autoFocus={autoFocus && i === 0}
            maxLength={3}
            placeholder="–"
            aria-label={f.label}
            aria-invalid={!!msg(f.key)}
            aria-describedby={`${idPrefix}-${f.key}-err`}
            value={text[f.key]}
            onChange={(e) => edit(f.key, e.target.value)}
            onBlur={() => setBlurred((b) => ({ ...b, [f.key]: true }))}
          />
          <label htmlFor={`${idPrefix}-${f.key}`} className="label">{f.label}</label>
          <div id={`${idPrefix}-${f.key}-err`} className="field-err">{msg(f.key)}</div>
        </div>
      ))}
    </div>
  )
}
