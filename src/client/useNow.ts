// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { useEffect, useState } from 'react'
import { nowLocal } from '../shared/dates'

/** Local 'YYYY-MM-DDTHH:MM', refreshed every 30 s and on focus: the PWA can stay open overnight. */
export function useNow(): string {
  const [now, setNow] = useState(() => nowLocal())
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
  return now
}
