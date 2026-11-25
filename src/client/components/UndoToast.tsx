// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useEffect } from 'react'

interface Props {
  message: string
  onUndo: () => void
  onDone: () => void
  timeoutMs?: number
}

export function UndoToast({ message, onUndo, onDone, timeoutMs = 6000 }: Props) {
  useEffect(() => {
    const t = setTimeout(() => onDone(), timeoutMs)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the toast is replaced (keyed by the caller)
  }, [timeoutMs])
  return (
    <div className="toast" role="status">
      <span>{message}</span>
      <button type="button" className="toast-undo" onClick={onUndo}>Undo</button>
    </div>
  )
}
