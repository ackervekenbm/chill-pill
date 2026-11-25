// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'
import { fakeApi, reading } from './test/fakeApi'
import { useData } from './useData'

const NEW = { takenAt: '2026-11-21T08:00', sys: 130, dia: 85, pulse: 65 }

it('adds a reading and re-sorts when an edit moves its date', async () => {
  fakeApi({ readings: [reading({ id: 1, takenAt: '2026-11-20T08:00' }), reading({ id: 2, takenAt: '2026-11-22T08:00' })] })
  const { result } = renderHook(() => useData())
  await waitFor(() => expect(result.current.loading).toBe(false))
  let id = 0
  await act(async () => {
    id = (await result.current.addReading(NEW)).id
  })
  expect(result.current.readings.map((r) => r.takenAt.slice(0, 10))).toEqual(['2026-11-20', '2026-11-21', '2026-11-22'])
  await act(async () => {
    await result.current.updateReading(id, { takenAt: '2026-11-19T08:00' })
  })
  expect(result.current.readings.map((r) => r.id)).toEqual([id, 1, 2])
})

it('a rejected mutation leaves state unchanged', async () => {
  const api = fakeApi({ readings: [reading()] })
  const { result } = renderHook(() => useData())
  await waitFor(() => expect(result.current.loading).toBe(false))
  api.failNext()
  await act(async () => {
    await expect(result.current.addReading(NEW)).rejects.toThrow()
  })
  expect(result.current.readings).toHaveLength(1)
})
